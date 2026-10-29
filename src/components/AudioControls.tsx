import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Square, Send, Sliders } from 'lucide-react';
import type { Language, OperationMode, RoomLockState } from '../types';
import { t } from '../locales/i18n';

interface AudioControlsProps {
  mode: OperationMode;
  isRecording: boolean;
  isProcessing: boolean;
  lockState: RoomLockState;
  currentUserId: string;
  currentLang: Language;
  onStartManualRecord: () => void;
  onStopManualRecord: () => void;
  onCancelRecord?: () => void;
  onSendText: (text: string) => void;
  onOpenCalibration: () => void;
  vadThresholdDb: number;
  liveTranscript?: string;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  mode,
  isRecording,
  isProcessing,
  lockState,
  currentUserId,
  currentLang,
  onStartManualRecord,
  onStopManualRecord,
  onCancelRecord,
  onSendText,
  onOpenCalibration,
  vadThresholdDb,
  liveTranscript,
}) => {
  const isLockedByOther = lockState.isLocked && lockState.lockedBy !== currentUserId;
  const [recordDuration, setRecordDuration] = useState(0);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      setRecordDuration(0);
      interval = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || isProcessing) return;
    onSendText(trimmed);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEditLiveTranscript = () => {
    if (liveTranscript) {
      setInputText(liveTranscript);
      onCancelRecord?.();
    }
  };

  return (
    <div className="bg-slate-900/95 border-t border-slate-800 safe-bottom px-3 sm:px-4 py-3">
      <div className="max-w-3xl mx-auto space-y-2.5">
        {/* Live Speech Recognition Transcript Pill (While recording) */}
        {isRecording && (
          <div className="w-full bg-rose-950/70 border border-rose-500/50 rounded-xl px-3 py-2 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 truncate min-w-0">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
              <span className="text-slate-300 truncate">
                {liveTranscript ? (
                  <>
                    <span className="text-rose-300 font-semibold mr-1.5">Đang nhận diện:</span>
                    <span className="text-white">"{liveTranscript}"</span>
                  </>
                ) : (
                  <span className="text-slate-400 italic">Đang lắng nghe giọng nói của bạn...</span>
                )}
              </span>
            </div>

            {/* Quick action buttons if AI misheard */}
            <div className="flex items-center gap-1.5 shrink-0">
              {liveTranscript && (
                <button
                  type="button"
                  onClick={handleEditLiveTranscript}
                  title="Chuyển câu này vào ô nhập để sửa trước khi gửi"
                  className="px-2 py-0.5 bg-blue-600/50 hover:bg-blue-600 text-blue-200 hover:text-white rounded-lg text-[11px] font-medium transition"
                >
                  Sửa câu
                </button>
              )}
              {onCancelRecord && (
                <button
                  type="button"
                  onClick={onCancelRecord}
                  title="Hủy bỏ, không gửi câu này"
                  className="px-2 py-0.5 bg-rose-900/60 hover:bg-rose-700 text-rose-300 hover:text-white rounded-lg text-[11px] font-medium transition"
                >
                  Hủy
                </button>
              )}
            </div>
          </div>
        )}

        {/* Input Bar & Controls Row */}
        <div className="flex items-center gap-2">
          {/* Quick Text Input for Messenger-style typing */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
              placeholder={
                currentLang === 'vi'
                  ? 'Nhập tin nhắn để dịch tức thì...'
                  : currentLang === 'zh'
                  ? '输入消息即时翻译...'
                  : 'Type a message to translate...'
              }
              className="w-full px-4 py-3 bg-slate-800/90 border border-slate-700/80 rounded-2xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-transparent transition"
            />
          </div>

          {/* Send Button (if text entered) */}
          {inputText.trim().length > 0 && (
            <button
              onClick={handleSend}
              disabled={isProcessing}
              title="Gửi tin nhắn dịch"
              className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl shadow-lg shadow-blue-500/25 transition active:scale-95 shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          )}

          {/* Big Voice Button */}
          {mode === 'ptt' ? (
            <button
              disabled={isLockedByOther || isProcessing}
              onClick={() => {
                if (isRecording) {
                  onStopManualRecord();
                } else {
                  onStartManualRecord();
                }
              }}
              title={isRecording ? 'Bấm để Dừng & Dịch' : 'Bấm để Bắt đầu nói'}
              className={`px-4 sm:px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-lg flex items-center justify-center gap-2 select-none active:scale-[0.98] shrink-0 ${
                isLockedByOther
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : isRecording
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/40 ring-4 ring-rose-500/30 animate-pulse'
                  : isProcessing
                  ? 'bg-blue-800 text-blue-200 cursor-wait'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/30'
              }`}
            >
              {isLockedByOther ? (
                <>
                  <MicOff className="w-4 h-4 text-slate-500" />
                  <span className="hidden sm:inline">{lockState.speakerName || 'Đang bận'}</span>
                </>
              ) : isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t('ptt_processing', currentLang)}</span>
                </>
              ) : isRecording ? (
                <>
                  <Square className="w-4 h-4 fill-current animate-bounce" />
                  <span>{recordDuration}s • Dừng & Dịch</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>Bấm để nói</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={onOpenCalibration}
              className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-blue-400 rounded-2xl transition shrink-0"
              title={`Độ nhạy Micro VAD (${vadThresholdDb} dB)`}
            >
              <Sliders className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
