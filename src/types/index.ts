export type Language = 'vi' | 'zh' | 'en';

export interface User {
  id: string;
  name: string;
  lang: Language;
  hasHeadphones: boolean;
}

export interface TranslationPayload {
  vi: string;
  zh: string;
  en: string;
}

export interface TranslationMessage {
  id: string;
  senderId: string;
  senderName: string;
  detectedLang: Language;
  originalText: string;
  translations: TranslationPayload;
  timestamp: number;
}

export interface RoomLockState {
  isLocked: boolean;
  lockedBy: string | null;
  speakerName: string | null;
  lockedAt: number | null;
}

export type OperationMode = 'vad' | 'ptt'; // 'vad' = Smart Proximity Auto, 'ptt' = Push-to-Talk

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'error';

export interface MqttMessage {
  type: 'LOCK_ROOM' | 'UNLOCK_ROOM' | 'TRANSLATION' | 'USER_JOIN' | 'HEARTBEAT' | 'EMERGENCY_UNLOCK';
  senderId: string;
  senderName?: string;
  timestamp: number;
  payload?: any;
}
