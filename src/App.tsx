import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Language, RoomLockState, TranslationMessage, ConnectionStatus, User } from './types';
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
import { JoinRoomScreen } from './components/JoinRoomScreen';
import { LiveSpeechPopup } from './components/LiveSpeechPopup';
import { ExportModal } from './components/ExportModal';

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

  // App Operation State (Push-to-Talk only for exhibition hall noise immunity)
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
  const audioLevelNormalized = isRecording ? 65 : 0;
  const [thresholdNormalized, setThresholdNormalized] = useState<number>(50);
  const vadThresholdDb = -38;

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
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const liveTranscriptRef = useRef<string>('');
  const [reviewText, setReviewText] = useState<string>('');

  useEffect(() => {
    speechRecognitionHelper.setUpdateCallback((text) => {
      liveTranscriptRef.current = text;
      setLiveTranscript(text);
    });
    speechRecognitionHelper.setErrorCallback((err) => {
      console.warn('SpeechRecognition error:', err);
      if (err === 'service-not-allowed' || err === 'not-allowed' || err === 'language-not-supported') {
        const isIOS =
          typeof navigator !== 'undefined' &&
          (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
        if (isIOS) {
          showErrorToast('Mẹo iPhone: Vào Cài đặt iPhone > Bàn phím > Bật "Bật Đọc chính tả" và Cho phép Micro trên Safari/Chrome để hiện văn bản tức thời.');
        } else {
          showErrorToast('Mẹo Samsung / Android: Hãy mở trang bằng Google Chrome và Cho phép Micro để hiển thị văn bản thời gian thực.');
        }
      }
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

  // Process recorded audio through Cloudflare Relay Proxy (/api/translate)
  // All devices (Vietnamese, English, Chinese) route through this relay first,
  // ensuring 100% immunity to Great Firewall blocks even on Chinese domestic WiFi!
  const processAndTranslateAudio = async (
    recordResult: AudioRecordResult | null,
    clientTranscript?: string,
    shouldReview: boolean = false
  ) => {
    setIsProcessing(true);
    try {
      const trimmedText = (clientTranscript || '').trim();

      // Lightweight payload: only send small text if available (50 bytes vs 500KB)
      const payload: any = {
        speakerLang: userRef.current.lang,
        clientTranscript: trimmedText,
      };

      if (!trimmedText && recordResult?.audioBase64) {
        payload.audioBase64 = recordResult.audioBase64;
        payload.mimeType = recordResult.mimeType || 'audio/webm';
      }

      // Always route through Cloudflare/Vercel relay proxy (/api/translate)
      // This bypasses the Great Firewall of China for all devices on Chinese WiFi!
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const detailed = errJson.details || errJson.error || `Lỗi máy chủ (${response.status})`;
        showErrorToast(`Lỗi dịch thuật: ${detailed}`);
        return;
      }

      const data = await response.json();

      // If audio was just background noise or empty
      const hasOriginalText = !!data.original_text?.trim();
      if (!hasOriginalText) {
        showErrorToast('AI không nghe rõ câu nói hoặc chỉ có tiếng ồn. Vui lòng nói to và rõ hơn.');
        return;
      }

      // If review is requested (user wants to verify accuracy before sending to chat)
      if (shouldReview) {
        setReviewText(data.original_text);
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

      // 2. Broadcast to room via MQTT so other devices can hear and read immediately in their language
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

    // 1. Initialize Audio Recorder instance
    audioRecorderRef.current = new CrossBrowserAudioRecorder();

    // 2. Initialize MQTT Realtime Service
    const mqttService = new MqttSyncService({
      roomId: room,
      peerId,
      userName: name,
      onStatusChange: (status) => setConnectionStatus(status),
      onMessage: handleIncomingTranslation,
      onLockStateChange: (state) => setLockState(state),
      onDeleteMessage: (msgId) => {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
      },
    });
    mqttService.connect();
    mqttServiceRef.current = mqttService;

    // Permanently unlock mobile audio autoplay on first user join gesture
    speechService.unlockMobileAudio();
  };

  // Recall / Delete message across all room participants
  const handleDeleteMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    mqttServiceRef.current?.broadcastDeleteMessage(messageId);
  };

  // Cancel current recording (if user clicks cancel or cancels review)
  const handleCancelRecord = () => {
    audioRecorderRef.current?.reset();
    speechRecognitionHelper.reset();
    setIsRecording(false);
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    setReviewText('');
    mqttServiceRef.current?.broadcastUnlock();
  };

  // Manual Push-to-Talk (PTT) Start
  const handleStartManualRecord = async () => {
    if (isRecording || isProcessing) return;
    if (lockState.isLocked && lockState.lockedBy !== user.id) return;

    // 1. Immediately stop any active TTS playback so it doesn't conflict with mic
    speechService.stop();
    setSpeakingMessageId(null);
    isSpeakingTtsRef.current = false;

    // Detect iOS devices (iPhone / iPad)
    const isIOS =
      typeof navigator !== 'undefined' &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    // Detect Android specifically (which has Knox / AudioRecord HAL single-mic hardware contention)
    const isAndroid =
      typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

    // 2. Start Web Speech Recognition synchronously within user gesture for live text on screen
    let startedSpeechRecognition = false;
    if (speechRecognitionHelper.isSupported()) {
      try {
        startedSpeechRecognition = speechRecognitionHelper.start(userRef.current.lang);
      } catch (e) {
        console.warn('SpeechRecognition start failed:', e);
        startedSpeechRecognition = false;
      }
    }

    const acquired = mqttServiceRef.current?.broadcastLock();
    if (!acquired) {
      speechRecognitionHelper.stop().catch(() => '');
      return;
    }

    setReviewText('');
    setLiveTranscript('');
    liveTranscriptRef.current = '';

    // 3. Audio Recording Handling
    // On Laptop / Desktop PC and iPhone / iPad (iOS): ALWAYS record audio concurrently as a guaranteed safety net!
    // This ensures subsequent recordings (2nd, 3rd, etc.) NEVER fail even if WebKit speech engine stutters.
    // On Android (Samsung): Only record audio if SpeechRecognition is NOT active,
    // to prevent Android AudioRecord HAL hardware contention that breaks speech recognition.
    const shouldRecordAudio = !isAndroid || !startedSpeechRecognition;

    if (shouldRecordAudio) {
      if (!audioRecorderRef.current) {
        audioRecorderRef.current = new CrossBrowserAudioRecorder();
      }

      let stream = mediaStreamRef.current;
      const isStreamValid =
        stream &&
        stream.active &&
        stream.getAudioTracks().length > 0 &&
        stream.getAudioTracks().every((t) => t.readyState === 'live' && !t.muted);

      if (!isStreamValid) {
        if (stream) {
          try {
            stream.getTracks().forEach((t) => t.stop());
          } catch (e) {}
        }
        try {
          const audioConstraints = isIOS
            ? true
            : {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              };

          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
          } catch (constraintErr) {
            // Fallback without constraints for picky browsers
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          }
          mediaStreamRef.current = stream;
        } catch (e: any) {
          console.warn('Lỗi mở Micro:', e);
          showErrorToast('Vui lòng cấp quyền Micro trong cài đặt trình duyệt để sử dụng.');
          speechRecognitionHelper.stop().catch(() => '');
          mqttServiceRef.current?.broadcastUnlock();
          return;
        }
      }

      if (!stream) {
        showErrorToast('Không thể kích hoạt Micro. Hãy thử làm mới trang hoặc kiểm tra quyền Micro.');
        speechRecognitionHelper.stop().catch(() => '');
        mqttServiceRef.current?.broadcastUnlock();
        return;
      }

      try {
        audioRecorderRef.current.start(stream);
      } catch (e) {
        console.warn('Audio recorder start failed:', e);
      }
    }

    setIsRecording(true);
  };

  // Direct Text Message Send (Instant Messenger-style translation)
  const handleSendTextMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;
    setReviewText('');
    await processAndTranslateAudio(null, text.trim());
  };

  // Manual Push-to-Talk (PTT) Stop
  const handleStopManualRecord = async (instantSend: boolean = false) => {
    if (!isRecording) return;

    setIsRecording(false);

    // Stop both in parallel
    const [recordResult, clientTranscript] = await Promise.all([
      audioRecorderRef.current && audioRecorderRef.current.isRecording()
        ? audioRecorderRef.current.stop().catch(() => null)
        : Promise.resolve(null),
      speechRecognitionHelper.isSupported()
        ? speechRecognitionHelper.stop().catch(() => '')
        : Promise.resolve(''),
    ]);

    // Note: Keep mediaStreamRef.current alive while in room so subsequent recordings start instantly without hardware re-acquisition latency

    const recognizedText = (
      clientTranscript ||
      speechRecognitionHelper.getCurrentTranscript() ||
      liveTranscriptRef.current ||
      liveTranscript ||
      ''
    ).trim();

    if (recognizedText) {
      // Speech recognition captured real-time text!
      if (instantSend) {
        setReviewText('');
        await processAndTranslateAudio(null, recognizedText, false);
      } else {
        setReviewText(recognizedText);
        mqttServiceRef.current?.broadcastUnlock();
      }
    } else if (recordResult && recordResult.audioBase64) {
      // Audio was recorded:
      // If instantSend is false, show Review Card so user can verify accuracy before sending!
      // If instantSend is true, send directly to chat.
      await processAndTranslateAudio(recordResult, '', !instantSend);
    } else {
      showErrorToast('Chưa nghe rõ câu nói. Hãy bấm và nói to hơn hoặc gõ trực tiếp vào ô nhắn tin.');
      mqttServiceRef.current?.broadcastUnlock();
    }
  };

  // Confirm review and translate
  const handleConfirmReview = async (text: string) => {
    setReviewText('');
    await processAndTranslateAudio(null, text.trim(), false);
  };

  const handleDismissReview = () => {
    audioRecorderRef.current?.reset();
    speechRecognitionHelper.reset();
    setIsRecording(false);
    setReviewText('');
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    mqttServiceRef.current?.broadcastUnlock();
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
        autoSpeak={autoSpeak}
        onAutoSpeakToggle={() => setAutoSpeak((prev) => !prev)}
        onOpenQr={() => setIsQrOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
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
        onDeleteMessage={handleDeleteMessage}
      />

      {/* Bottom Audio & Quick Text Controller (PTT) */}
      <AudioControls
        isRecording={isRecording}
        isProcessing={isProcessing}
        lockState={lockState}
        currentUserId={user.id}
        currentLang={user.lang}
        onStartManualRecord={handleStartManualRecord}
        onStopManualRecord={handleStopManualRecord}
        onCancelRecord={handleCancelRecord}
        onSendText={handleSendTextMessage}
        liveTranscript={liveTranscript}
        reviewText={reviewText}
        onConfirmSend={handleConfirmReview}
        onDismissReview={handleDismissReview}
      />

      {/* QR Code Modal for Onboarding Partners */}
      <QrModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        roomId={roomId}
        currentLang={user.lang}
      />

      {/* Export Conversation Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        messages={messages}
        roomId={roomId}
        currentLang={user.lang}
        currentUserId={user.id}
      />
    </div>
  );
};

export default App;
