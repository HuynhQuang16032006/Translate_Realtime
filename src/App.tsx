import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Language, OperationMode, RoomLockState, TranslationMessage, ConnectionStatus, User } from './types';
import { AudioDspEngine } from './services/audioDsp';
import { CrossBrowserAudioRecorder } from './services/mediaRecorderHelper';
import type { AudioRecordResult } from './services/mediaRecorderHelper';
import { MqttSyncService } from './services/mqttService';
import { speechService } from './services/speechSynthesisService';
import { wakeLockService } from './services/wakeLockService';
import { WeChatDetector } from './components/WeChatDetector';
import { RoomHeader } from './components/RoomHeader';
import { LiveStatusBar } from './components/LiveStatusBar';
import { ChatFeed } from './components/ChatFeed';
import { AudioControls } from './components/AudioControls';
import { QrModal } from './components/QrModal';
import { CalibrationModal } from './components/CalibrationModal';
import { JoinRoomScreen } from './components/JoinRoomScreen';

export const App: React.FC = () => {
  // Session & User State
  const [inRoom, setInRoom] = useState<boolean>(false);
  const [user, setUser] = useState<User>({
    id: '',
    name: '',
    lang: 'vi',
    hasHeadphones: false,
  });
  const [roomId, setRoomId] = useState<string>('');

  // Realtime & Mutex Lock State
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lockState, setLockState] = useState<RoomLockState>({
    isLocked: false,
    lockedBy: null,
    speakerName: null,
    lockedAt: null,
  });

  // App Operation State
  const [operationMode, setOperationMode] = useState<OperationMode>('ptt'); // Start with PTT for safety in noisy expo, user can switch to VAD
  const [messages, setMessages] = useState<TranslationMessage[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Audio DSP & VAD Visualizer
  const [audioLevelNormalized, setAudioLevelNormalized] = useState<number>(0);
  const [thresholdNormalized, setThresholdNormalized] = useState<number>(50);
  const [vadThresholdDb, setVadThresholdDb] = useState<number>(-38);

  // Modals
  const [isQrOpen, setIsQrOpen] = useState<boolean>(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false);

  // Service References
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const dspEngineRef = useRef<AudioDspEngine | null>(null);
  const audioRecorderRef = useRef<CrossBrowserAudioRecorder | null>(null);
  const mqttServiceRef = useRef<MqttSyncService | null>(null);
  const isSpeakingTtsRef = useRef<boolean>(false);

  // State refs to access latest values in DSP callbacks without re-binding
  const inRoomRef = useRef(inRoom);
  inRoomRef.current = inRoom;
  const lockStateRef = useRef(lockState);
  lockStateRef.current = lockState;
  const userRef = useRef(user);
  userRef.current = user;
  const operationModeRef = useRef(operationMode);
  operationModeRef.current = operationMode;
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;
  const isProcessingRef = useRef(isProcessing);
  isProcessingRef.current = isProcessing;

  // Initialize room ID from URL if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get('room');
      if (urlRoom) {
        setRoomId(urlRoom);
      }
    }
  }, []);

  // Calculate normalized threshold for UI
  const calculateNormalizedThreshold = useCallback((db: number) => {
    return Math.min(100, Math.max(0, ((db + 80) / 80) * 100));
  }, []);

  // Update threshold UI whenever dB changes
  useEffect(() => {
    setThresholdNormalized(calculateNormalizedThreshold(vadThresholdDb));
  }, [vadThresholdDb, calculateNormalizedThreshold]);

  // Handle incoming translation from MQTT
  const handleIncomingTranslation = useCallback((msg: TranslationMessage) => {
    setMessages((prev) => {
      // Deduplicate by message ID
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });

    // If current user is wearing headphones, automatically play TTS
    if (userRef.current.hasHeadphones) {
      const translated = msg.translations[userRef.current.lang] || msg.originalText;
      if (translated) {
        setSpeakingMessageId(msg.id);
        isSpeakingTtsRef.current = true;
        speechService.speak(
          translated,
          userRef.current.lang,
          () => {
            isSpeakingTtsRef.current = true;
          },
          () => {
            isSpeakingTtsRef.current = false;
            setSpeakingMessageId(null);
          }
        );
      }
    }
  }, []);

  // Process recorded audio through Gemini 2.5 Flash Backend
  const processAndTranslateAudio = async (recordResult: AudioRecordResult) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: recordResult.audioBase64,
          mimeType: recordResult.mimeType,
          speakerLang: userRef.current.lang,
        }),
      });

      if (!response.ok) {
        throw new Error(`Lỗi máy chủ (${response.status})`);
      }

      const data = await response.json();

      // If Gemini detected that the audio was just background machinery noise or empty
      if (data.is_noise_or_empty || !data.original_text?.trim()) {
        console.log('Bỏ qua: Đoạn âm thanh là tiếng ồn máy móc hoặc im lặng.');
        return;
      }

      const newMsg: TranslationMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        senderId: userRef.current.id,
        senderName: userRef.current.name,
        detectedLang: data.detected_lang || userRef.current.lang,
        originalText: data.original_text,
        translations: {
          vi: data.translations?.vi || data.original_text,
          zh: data.translations?.zh || data.original_text,
          en: data.translations?.en || data.original_text,
        },
        timestamp: Date.now(),
      };

      // Add to local state
      setMessages((prev) => [...prev, newMsg]);

      // Broadcast to room via MQTT
      if (mqttServiceRef.current) {
        mqttServiceRef.current.broadcastTranslation(newMsg);
      }
    } catch (err) {
      console.error('Lỗi phiên dịch audio:', err);
    } finally {
      setIsProcessing(false);
      // Release Mutex Lock
      if (mqttServiceRef.current) {
        mqttServiceRef.current.broadcastUnlock();
      }
    }
  };

  // VAD Voice Start Handler
  const handleVoiceStart = useCallback(() => {
    // Only in VAD mode
    if (operationModeRef.current !== 'vad') return;
    // Do not trigger if already recording or processing
    if (isRecordingRef.current || isProcessingRef.current) return;
    // Do not trigger if speech TTS is actively speaking (Anti-Echo Protection)
    if (isSpeakingTtsRef.current) return;
    // Check if room is locked by someone else
    if (lockStateRef.current.isLocked && lockStateRef.current.lockedBy !== userRef.current.id) {
      return;
    }

    // Try to acquire room mutex lock
    const acquired = mqttServiceRef.current?.broadcastLock();
    if (!acquired) return;

    if (mediaStreamRef.current && audioRecorderRef.current) {
      audioRecorderRef.current.start(mediaStreamRef.current);
      setIsRecording(true);
    }
  }, []);

  // VAD Voice End Handler (Called after 1.2s silence)
  const handleVoiceEnd = useCallback(async () => {
    if (operationModeRef.current !== 'vad') return;
    if (!isRecordingRef.current) return;

    setIsRecording(false);
    if (audioRecorderRef.current) {
      const result = await audioRecorderRef.current.stop();
      if (result) {
        await processAndTranslateAudio(result);
      } else {
        // Empty or too short audio, release lock
        mqttServiceRef.current?.broadcastUnlock();
      }
    }
  }, []);

  // Join Room Execution
  const handleJoinRoom = async (name: string, room: string, lang: Language) => {
    const peerId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newUser: User = {
      id: peerId,
      name,
      lang,
      hasHeadphones: false,
    };

    setUser(newUser);
    setRoomId(room);
    setInRoom(true);

    // Keep screen awake (iOS Safari / Android)
    wakeLockService.requestLock();

    // 1. Initialize Micro Stream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // 2. Initialize Audio DSP Engine
      const dsp = new AudioDspEngine({
        thresholdDb: vadThresholdDb,
        silenceTimeoutMs: 1200,
        onVoiceStart: handleVoiceStart,
        onVoiceEnd: handleVoiceEnd,
        onAudioLevel: (_db, normalized) => {
          setAudioLevelNormalized(normalized);
        },
      });
      await dsp.init(stream);
      dspEngineRef.current = dsp;

      // 3. Initialize Audio Recorder
      audioRecorderRef.current = new CrossBrowserAudioRecorder();
    } catch (err: any) {
      console.warn('Lỗi mở Micro:', err);
      alert('Vui lòng cấp quyền Micro trong trình duyệt để sử dụng tính năng phiên dịch.');
    }

    // 4. Initialize MQTT Realtime Service
    const mqttService = new MqttSyncService({
      roomId: room,
      peerId,
      userName: name,
      onStatusChange: (status) => setConnectionStatus(status),
      onMessage: handleIncomingTranslation,
      onLockStateChange: (state) => setLockState(state),
    });
    mqttService.connect();
    mqttServiceRef.current = mqttService;
  };

  // Manual Push-to-Talk (PTT) Start
  const handleStartManualRecord = () => {
    if (operationMode !== 'ptt') return;
    if (isRecording || isProcessing) return;
    if (lockState.isLocked && lockState.lockedBy !== user.id) return;

    // Acquire lock
    const acquired = mqttServiceRef.current?.broadcastLock();
    if (!acquired) return;

    if (mediaStreamRef.current && audioRecorderRef.current) {
      audioRecorderRef.current.start(mediaStreamRef.current);
      setIsRecording(true);
    }
  };

  // Manual Push-to-Talk (PTT) Stop
  const handleStopManualRecord = async () => {
    if (operationMode !== 'ptt') return;
    if (!isRecording) return;

    setIsRecording(false);
    if (audioRecorderRef.current) {
      const result = await audioRecorderRef.current.stop();
      if (result) {
        await processAndTranslateAudio(result);
      } else {
        mqttServiceRef.current?.broadcastUnlock();
      }
    }
  };

  // Manual TTS Speak on chat bubble click
  const handlePlayMessageAudio = (text: string, lang: Language) => {
    if (speechService.isSpeaking()) {
      speechService.stop();
      setSpeakingMessageId(null);
      isSpeakingTtsRef.current = false;
      return;
    }

    setSpeakingMessageId(text);
    isSpeakingTtsRef.current = true;

    speechService.speak(
      text,
      lang,
      () => {
        isSpeakingTtsRef.current = true;
      },
      () => {
        isSpeakingTtsRef.current = false;
        setSpeakingMessageId(null);
      }
    );
  };

  // Emergency room unlock
  const handleEmergencyUnlock = () => {
    mqttServiceRef.current?.broadcastEmergencyUnlock();
  };

  // Run Noise Floor Calibration
  const handleRunAutoCalibrate = async (): Promise<number> => {
    if (!dspEngineRef.current) return -40;
    const recommended = await dspEngineRef.current.calibrateNoiseFloor();
    setVadThresholdDb(recommended);
    return recommended;
  };

  // Save manual dB threshold
  const handleSaveThreshold = (db: number) => {
    setVadThresholdDb(db);
    dspEngineRef.current?.updateConfig({ thresholdDb: db });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wakeLockService.releaseLock();
      dspEngineRef.current?.stop();
      mqttServiceRef.current?.disconnect();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // If user hasn't joined room, show entrance screen
  if (!inRoom) {
    return (
      <>
        <WeChatDetector />
        <JoinRoomScreen initialRoomId={roomId} onJoin={handleJoinRoom} />
      </>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* WeChat In-App Browser Warning & Overlay */}
      <WeChatDetector />

      {/* Top Navigation & Settings Header */}
      <RoomHeader
        roomId={roomId}
        connectionStatus={connectionStatus}
        currentLang={user.lang}
        onLanguageChange={(newLang) => setUser((prev) => ({ ...prev, lang: newLang }))}
        mode={operationMode}
        onModeToggle={() => setOperationMode((prev) => (prev === 'vad' ? 'ptt' : 'vad'))}
        hasHeadphones={user.hasHeadphones}
        onHeadphonesToggle={() =>
          setUser((prev) => ({ ...prev, hasHeadphones: !prev.hasHeadphones }))
        }
        onOpenQr={() => setIsQrOpen(true)}
        onOpenCalibration={() => setIsCalibrationOpen(true)}
      />

      {/* Mutex Lock Status & Sound Level Bar */}
      <LiveStatusBar
        lockState={lockState}
        currentUserId={user.id}
        isRecording={isRecording}
        isProcessing={isProcessing}
        audioLevelNormalized={audioLevelNormalized}
        thresholdNormalized={thresholdNormalized}
        onEmergencyUnlock={handleEmergencyUnlock}
      />

      {/* Messages Chat Feed */}
      <ChatFeed
        messages={messages}
        currentUserId={user.id}
        currentLang={user.lang}
        onPlayAudio={handlePlayMessageAudio}
        speakingMessageId={speakingMessageId}
      />

      {/* Bottom Audio Controller (PTT or VAD) */}
      <AudioControls
        mode={operationMode}
        isRecording={isRecording}
        isProcessing={isProcessing}
        lockState={lockState}
        currentUserId={user.id}
        onStartManualRecord={handleStartManualRecord}
        onStopManualRecord={handleStopManualRecord}
        onOpenCalibration={() => setIsCalibrationOpen(true)}
        vadThresholdDb={vadThresholdDb}
      />

      {/* QR Code Modal for Onboarding Partners */}
      <QrModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        roomId={roomId}
      />

      {/* Noise Calibration Modal */}
      <CalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        currentThreshold={vadThresholdDb}
        onSaveThreshold={handleSaveThreshold}
        onRunAutoCalibrate={handleRunAutoCalibrate}
      />
    </div>
  );
};

export default App;
