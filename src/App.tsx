import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Language, OperationMode, RoomLockState, TranslationMessage, ConnectionStatus, User } from './types';
import { AudioDspEngine } from './services/audioDsp';
import { CrossBrowserAudioRecorder } from './services/mediaRecorderHelper';
import type { AudioRecordResult } from './services/mediaRecorderHelper';
import { MqttSyncService } from './services/mqttService';
import { speechService } from './services/speechSynthesisService';
import { wakeLockService } from './services/wakeLockService';
import { speechRecognitionHelper } from './services/speechRecognitionService';
import { WeChatDetector } from './components/WeChatDetector';
import { RoomHeader } from './components/RoomHeader';
import { LiveStatusBar } from './components/LiveStatusBar';
import { ChatFeed } from './components/ChatFeed';
import { AudioControls } from './components/AudioControls';
import { QrModal } from './components/QrModal';
import { CalibrationModal } from './components/CalibrationModal';
import { JoinRoomScreen } from './components/JoinRoomScreen';
import { LiveSpeechPopup } from './components/LiveSpeechPopup';
import { ApiKeyModal } from './components/ApiKeyModal';

export const App: React.FC = () => {
  // Session & User State
  const [inRoom, setInRoom] = useState<boolean>(false);
  const [user, setUser] = useState<User>({
    id: '',
    name: '',
    lang: 'vi',
    hasHeadphones: true,
  });
  const [roomId, setRoomId] = useState<string>('');

  // Auto-speak incoming translations (Default TRUE for instant real-time audio)
  const [autoSpeak, setAutoSpeak] = useState<boolean>(true);

  // Realtime & Mutex Lock State
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lockState, setLockState] = useState<RoomLockState>({
    isLocked: false,
    lockedBy: null,
    speakerName: null,
    lockedAt: null,
  });

  // App Operation State
  const [operationMode, setOperationMode] = useState<OperationMode>('ptt'); // Start with PTT for optimal noise rejection, switchable to VAD
  const [messages, setMessages] = useState<TranslationMessage[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Live Speech Popup State (Shows what was just said as it is spoken)
  const [livePopup, setLivePopup] = useState<{
    isVisible: boolean;
    speakerName: string;
    translatedText: string;
    originalText: string;
  }>({
    isVisible: false,
    speakerName: '',
    translatedText: '',
    originalText: '',
  });
  const popupTimerRef = useRef<any>(null);

  // Audio DSP & VAD Visualizer
  const [audioLevelNormalized, setAudioLevelNormalized] = useState<number>(0);
  const [thresholdNormalized, setThresholdNormalized] = useState<number>(50);
  const [vadThresholdDb, setVadThresholdDb] = useState<number>(-38);

  // Toast Error Alert State
  const [toastError, setToastError] = useState<string | null>(null);

  const showErrorToast = (msg: string) => {
    setToastError(msg);
    setTimeout(() => {
      setToastError((prev) => (prev === msg ? null : prev));
    }, 6000);
  };

  // Modals
  const [isQrOpen, setIsQrOpen] = useState<boolean>(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false);
  const [isApiKeyOpen, setIsApiKeyOpen] = useState<boolean>(false);
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('expotrans_gemini_api_key') || '' : '';
  });
  const [liveTranscript, setLiveTranscript] = useState<string>('');

  useEffect(() => {
    speechRecognitionHelper.setUpdateCallback((text) => {
      setLiveTranscript(text);
    });
  }, []);

  // Service References
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const dspEngineRef = useRef<AudioDspEngine | null>(null);
  const audioRecorderRef = useRef<CrossBrowserAudioRecorder | null>(null);
  const mqttServiceRef = useRef<MqttSyncService | null>(null);
  const isSpeakingTtsRef = useRef<boolean>(false);

  // State refs to access latest values in async DSP / MQTT callbacks without stale closure
  const inRoomRef = useRef(inRoom);
  inRoomRef.current = inRoom;
  const lockStateRef = useRef(lockState);
  lockStateRef.current = lockState;
  const userRef = useRef(user);
  userRef.current = user;
  const autoSpeakRef = useRef(autoSpeak);
  autoSpeakRef.current = autoSpeak;
  const operationModeRef = useRef(operationMode);
  operationModeRef.current = operationMode;
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;
  const isProcessingRef = useRef(isProcessing);
  isProcessingRef.current = isProcessing;

  // 1. Auto-detect room ID from URL query parameters (for direct QR scan entry)
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
    // If the message is from myself, it was already handled locally
    if (msg.senderId === userRef.current.id) {
      return;
    }

    setMessages((prev) => {
      // Deduplicate by message ID
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });

    const currentDeviceLang = userRef.current.lang;
    const translatedText = msg.translations[currentDeviceLang] || msg.originalText;

    // Trigger Floating Live Speech Popup
    if (translatedText) {
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
      setLivePopup({
        isVisible: true,
        speakerName: msg.senderName,
        translatedText,
        originalText: msg.originalText,
      });

      // Auto dismiss popup after 6 seconds
      popupTimerRef.current = setTimeout(() => {
        setLivePopup((prev) => ({ ...prev, isVisible: false }));
      }, 6000);
    }

    // Auto-Speak Playback (Read out loud in device's chosen language)
    if (autoSpeakRef.current && translatedText) {
      setSpeakingMessageId(msg.id);
      isSpeakingTtsRef.current = true;
      speechService.speak(
        translatedText,
        currentDeviceLang,
        () => {
          isSpeakingTtsRef.current = true;
        },
        () => {
          isSpeakingTtsRef.current = false;
          setSpeakingMessageId(null);
        }
      );
    }
  }, []);

  // Process recorded audio through Gemini / Fast Translation Backend
  const processAndTranslateAudio = async (
    recordResult: AudioRecordResult | null,
    clientTranscript?: string
  ) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: recordResult?.audioBase64 || '',
          mimeType: recordResult?.mimeType || 'audio/webm',
          speakerLang: userRef.current.lang,
          clientTranscript: clientTranscript || '',
          userApiKey: customApiKey,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const detailed = errJson.details || errJson.error || `Lỗi máy chủ (${response.status})`;
        showErrorToast(`Lỗi dịch thuật: ${detailed}`);
        return;
      }

      const data = await response.json();

      // If audio was just background noise or empty
      if (data.is_noise_or_empty || !data.original_text?.trim()) {
        showErrorToast('AI không nghe rõ câu nói hoặc chỉ có tiếng ồn. Vui lòng nói to và rõ hơn.');
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

      // 1. Add to local state (appears on right side like Messenger)
      setMessages((prev) => [...prev, newMsg]);

      // 2. Trigger Floating Live Speech Popup immediately for the speaker
      const currentDeviceLang = userRef.current.lang;
      const speakerTranslated = newMsg.translations[currentDeviceLang] || newMsg.originalText;
      if (speakerTranslated) {
        if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
        setLivePopup({
          isVisible: true,
          speakerName: newMsg.senderName,
          translatedText: speakerTranslated,
          originalText: newMsg.originalText,
        });

        popupTimerRef.current = setTimeout(() => {
          setLivePopup((prev) => ({ ...prev, isVisible: false }));
        }, 6000);
      }

      // 3. Broadcast to room via MQTT so other devices can hear and read immediately
      if (mqttServiceRef.current) {
        mqttServiceRef.current.broadcastTranslation(newMsg);
      }
    } catch (err: any) {
      console.error('Lỗi phiên dịch audio:', err);
      showErrorToast(`Lỗi kết nối: ${err?.message || 'Không thể gửi đoạn thu âm'}`);
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
    if (operationModeRef.current !== 'vad') return;
    if (isRecordingRef.current || isProcessingRef.current) return;
    if (isSpeakingTtsRef.current) return; // Anti-Echo Protection while reading
    if (lockStateRef.current.isLocked && lockStateRef.current.lockedBy !== userRef.current.id) {
      return;
    }

    const acquired = mqttServiceRef.current?.broadcastLock();
    if (!acquired) return;

    if (mediaStreamRef.current && audioRecorderRef.current) {
      audioRecorderRef.current.start(mediaStreamRef.current);
      speechRecognitionHelper.start(userRef.current.lang);
      setIsRecording(true);
    }
  }, []);

  // VAD Voice End Handler (1.2s silence)
  const handleVoiceEnd = useCallback(async () => {
    if (operationModeRef.current !== 'vad') return;
    if (!isRecordingRef.current) return;

    setIsRecording(false);
    if (audioRecorderRef.current) {
      const [recordResult, clientTranscript] = await Promise.all([
        audioRecorderRef.current.stop(),
        speechRecognitionHelper.stop(),
      ]);

      let textToUse = (clientTranscript || speechRecognitionHelper.getCurrentTranscript() || liveTranscript || '').trim();

      // Free serverless STT fallback if browser Web Speech API did not capture audio
      if (!textToUse && recordResult?.blob) {
        textToUse = await speechRecognitionHelper.transcribeAudioBlobWithPuter(recordResult.blob);
      }

      if (textToUse) {
        await processAndTranslateAudio(null, textToUse);
      } else if (recordResult) {
        await processAndTranslateAudio(recordResult, '');
      } else {
        mqttServiceRef.current?.broadcastUnlock();
      }
    }
  }, [liveTranscript]);

  // Join Room Execution
  const handleJoinRoom = async (name: string, room: string, lang: Language) => {
    const peerId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newUser: User = {
      id: peerId,
      name,
      lang,
      hasHeadphones: true,
    };

    setUser(newUser);
    setRoomId(room);
    setInRoom(true);

    // Keep screen awake (iOS Safari / Android)
    wakeLockService.requestLock();

    // 1. Initialize Microphone Stream
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
      alert('Vui lòng cấp quyền Micro trong trình duyệt để đàm thoại.');
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

    const acquired = mqttServiceRef.current?.broadcastLock();
    if (!acquired) return;

    if (mediaStreamRef.current && audioRecorderRef.current) {
      setLiveTranscript('');
      audioRecorderRef.current.start(mediaStreamRef.current);
      speechRecognitionHelper.start(userRef.current.lang);
      setIsRecording(true);
    }
  };

  // Direct Text Message Send (Instant Messenger-style translation)
  const handleSendTextMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;
    await processAndTranslateAudio(null, text.trim());
  };

  // Manual Push-to-Talk (PTT) Stop
  const handleStopManualRecord = async () => {
    if (operationMode !== 'ptt') return;
    if (!isRecording) return;

    setIsRecording(false);
    if (audioRecorderRef.current) {
      const [recordResult, clientTranscript] = await Promise.all([
        audioRecorderRef.current.stop(),
        speechRecognitionHelper.stop(),
      ]);

      let textToUse = (clientTranscript || speechRecognitionHelper.getCurrentTranscript() || liveTranscript || '').trim();

      // Free serverless STT fallback if browser Web Speech API did not capture audio
      if (!textToUse && recordResult?.blob) {
        textToUse = await speechRecognitionHelper.transcribeAudioBlobWithPuter(recordResult.blob);
      }

      if (textToUse) {
        await processAndTranslateAudio(null, textToUse);
      } else if (recordResult) {
        await processAndTranslateAudio(recordResult, '');
      } else {
        mqttServiceRef.current?.broadcastUnlock();
      }
    }
  };

  // Manual TTS Playback on message click
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

  // Leave room and return to entrance screen
  const handleLeaveRoom = () => {
    dspEngineRef.current?.stop();
    mqttServiceRef.current?.disconnect();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    setInRoom(false);
    setMessages([]);
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

  // Entrance Screen (if not yet in room)
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

      {/* Floating Toast Error Alert */}
      {toastError && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-rose-950/95 border-2 border-rose-500/80 text-rose-100 text-xs sm:text-sm font-semibold p-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 backdrop-blur-xl ring-4 ring-rose-500/20">
            <span className="leading-snug">⚠️ {toastError}</span>
            <button
              onClick={() => setToastError(null)}
              className="text-rose-400 hover:text-white p-1 rounded-lg hover:bg-rose-900 transition shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Floating Live Speech Toast Popup */}
      <LiveSpeechPopup
        speakerName={livePopup.speakerName}
        translatedText={livePopup.translatedText}
        originalText={livePopup.originalText}
        currentLang={user.lang}
        isVisible={livePopup.isVisible}
        onDismiss={() => setLivePopup((prev) => ({ ...prev, isVisible: false }))}
      />

      {/* Top Navigation & Settings Header */}
      <RoomHeader
        roomId={roomId}
        connectionStatus={connectionStatus}
        currentLang={user.lang}
        onLanguageChange={(newLang) => setUser((prev) => ({ ...prev, lang: newLang }))}
        mode={operationMode}
        onModeToggle={() => setOperationMode((prev) => (prev === 'vad' ? 'ptt' : 'vad'))}
        autoSpeak={autoSpeak}
        onAutoSpeakToggle={() => setAutoSpeak((prev) => !prev)}
        onOpenQr={() => setIsQrOpen(true)}
        onOpenCalibration={() => setIsCalibrationOpen(true)}
        onOpenApiKey={() => setIsApiKeyOpen(true)}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* Mutex Lock Status & Sound Level Bar */}
      <LiveStatusBar
        lockState={lockState}
        currentUserId={user.id}
        currentLang={user.lang}
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

      {/* Bottom Audio & Quick Text Controller (PTT or VAD) */}
      <AudioControls
        mode={operationMode}
        isRecording={isRecording}
        isProcessing={isProcessing}
        lockState={lockState}
        currentUserId={user.id}
        currentLang={user.lang}
        onStartManualRecord={handleStartManualRecord}
        onStopManualRecord={handleStopManualRecord}
        onSendText={handleSendTextMessage}
        onOpenCalibration={() => setIsCalibrationOpen(true)}
        vadThresholdDb={vadThresholdDb}
        liveTranscript={liveTranscript}
      />

      {/* QR Code Modal for Onboarding Partners */}
      <QrModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        roomId={roomId}
        currentLang={user.lang}
      />

      {/* Noise Calibration Modal */}
      <CalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        currentThreshold={vadThresholdDb}
        currentLang={user.lang}
        onSaveThreshold={handleSaveThreshold}
        onRunAutoCalibrate={handleRunAutoCalibrate}
      />

      {/* Custom Gemini API Key Settings Modal */}
      <ApiKeyModal
        isOpen={isApiKeyOpen}
        onClose={() => setIsApiKeyOpen(false)}
        currentLang={user.lang}
        savedKey={customApiKey}
        onSaveKey={(key) => {
          setCustomApiKey(key);
          if (typeof window !== 'undefined') {
            localStorage.setItem('expotrans_gemini_api_key', key);
          }
        }}
      />
    </div>
  );
};

export default App;
