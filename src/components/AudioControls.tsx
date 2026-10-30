import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Square, Send, X, Edit3, Radio, Check, ArrowRight } from 'lucide-react';
import type { Language, RoomLockState } from '../types';
import { t } from '../locales/i18n';

interface AudioControlsProps {
  isRecording: boolean;
  isProcessing: boolean;
  lockState: RoomLockState;
  currentUserId: string;
  currentLang: Language;
  onStartManualRecord: () => void;
  onStopManualRecord: (instantSend?: boolean) => void;
  onCancelRecord?: () => void;
  onSendText: (text: string) => void;
  liveTranscript?: string;
  reviewText?: string;
  onConfirmSend?: (text: string) => void;
  onDismissReview?: () => void;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  isRecording,
  isProcessing,
  lockState,
  currentUserId,
  currentLang,
  onStartManualRecord,
  onStopManualRecord,
  onCancelRecord,
  onSendText,
  liveTranscript = '',
  reviewText = '',
  onConfirmSend,
  onDismissReview,
}) => {
  const isLockedByOther = lockState.isLocked && lockState.lockedBy !== currentUserId;
  const [recordDuration, setRecordDuration] = useState(0);
  const [inputText, setInputText] = useState('');
  const [editableReviewText, setEditableReviewText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync reviewText into editable field whenever new reviewText arrives
  useEffect(() => {
    if (reviewText) {
      setEditableReviewText(reviewText);
    }
  }, [reviewText]);

  // Live sync transcript into input text while recording so user sees text everywhere
  useEffect(() => {
    if (isRecording && liveTranscript) {
      setInputText(liveTranscript);
    }
  }, [isRecording, liveTranscript]);

  // Duration timer while recording
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

  const handleEditInInput = (textToEdit: string) => {
    setInputText(textToEdit);
    onDismissReview?.();
    onCancelRecord?.();
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleConfirmReviewSend = () => {
    const finalToSend = editableReviewText.trim() || reviewText.trim();
    if (!finalToSend || isProcessing) return;
    if (onConfirmSend) {
      onConfirmSend(finalToSend);
    } else {
      onSendText(finalToSend);
    }
  };

  return (
    <div className="bg-slate-900/95 border-t border-slate-800 safe-bottom px-3 sm:px-4 py-3">
      <div className="max-w-3xl mx-auto space-y-2.5">
        {/* STATE 1: LIVE RECORDING IN PROGRESS CARD */}
        {isRecording && (
          <div className="w-full bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-rose-500 rounded-2xl p-3.5 shadow-2xl shadow-rose-950/70 backdrop-blur-md animate-in slide-in-from-bottom-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                </span>
                <span className="font-bold text-rose-400 flex items-center gap-1.5">
                  <span>{t('audio_recognizing', currentLang)}</span>
                  <span className="font-mono text-white text-[11px] px-1.5 py-0.5 bg-rose-950/80 rounded border border-rose-500/40">
                    {recordDuration}s
                  </span>
                </span>
              </div>

              {/* Pulsing Voice Waveform */}
              <div className="flex items-center gap-1 px-2 py-0.5 bg-rose-950/40 rounded-full border border-rose-500/20">
                <div className="w-1 h-3 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-2 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <div className="w-1 h-4 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '75ms' }} />
              </div>

              {onCancelRecord && (
                <button
                  type="button"
                  onClick={onCancelRecord}
                  title={t('audio_cancel_tooltip', currentLang)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Real-time Streaming Transcript Box */}
            <div className="min-h-[64px] max-h-36 overflow-y-auto p-3 bg-slate-950 rounded-xl border border-rose-500/30 text-sm sm:text-base leading-relaxed break-words select-text">
              {liveTranscript.trim() ? (
                <div className="text-white font-medium flex items-start gap-2">
                  <span className="text-emerald-400 shrink-0 mt-0.5">💬</span>
                  <span className="text-slate-100">{liveTranscript}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400 italic text-xs sm:text-sm py-2">
                  <Radio className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
                  <span>{t('audio_listening', currentLang)}</span>
                </div>
              )}
            </div>

            {/* Bottom Actions During Recording */}
            <div className="flex items-center justify-between pt-3 mt-1 gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2">
                {liveTranscript.trim() && (
                  <button
                    type="button"
                    onClick={() => handleEditInInput(liveTranscript)}
                    title={t('audio_edit_tooltip', currentLang)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                    <span>{t('audio_edit_btn', currentLang)}</span>
                  </button>
                )}
                {onCancelRecord && (
                  <button
                    type="button"
                    onClick={onCancelRecord}
                    className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-rose-900/40 text-slate-400 hover:text-rose-200 rounded-xl text-xs font-medium transition"
                  >
                    {t('audio_cancel_btn', currentLang)}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {/* Instant Send Shortcut */}
                <button
                  type="button"
                  onClick={() => onStopManualRecord(true)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-600/30 active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{t('audio_direct_send', currentLang)}</span>
                </button>

                {/* Stop & Review */}
                <button
                  type="button"
                  onClick={() => onStopManualRecord(false)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-rose-600/30 active:scale-95"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>{t('audio_stop_and_translate', currentLang)}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STATE 2: REVIEW & CONFIRMATION CARD (Displays after speaking so user can verify accuracy!) */}
        {!isRecording && reviewText.trim().length > 0 && (
          <div className="w-full bg-slate-900/95 border-2 border-emerald-500/80 rounded-2xl p-3.5 shadow-2xl shadow-emerald-950/60 backdrop-blur-md animate-in slide-in-from-bottom-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-emerald-500/20 text-emerald-400 rounded-md">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span className="font-bold text-emerald-400 text-xs sm:text-sm">
                  {t('audio_confirm_title', currentLang)}
                </span>
              </div>

              {onDismissReview && (
                <button
                  type="button"
                  onClick={onDismissReview}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Editable Confirmation Box */}
            <div className="relative">
              <textarea
                value={editableReviewText}
                onChange={(e) => setEditableReviewText(e.target.value)}
                rows={2}
                placeholder="Nội dung đã nhận diện..."
                className="w-full p-2.5 bg-slate-950 rounded-xl border border-slate-700/80 text-white text-sm sm:text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-transparent resize-none transition select-text"
              />
            </div>

            {/* Action Buttons: Confirm & Translate, Edit, or Cancel */}
            <div className="flex items-center justify-between pt-2.5 mt-1 gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleEditInInput(editableReviewText)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                  <span>{t('audio_confirm_edit', currentLang)}</span>
                </button>

                {onDismissReview && (
                  <button
                    type="button"
                    onClick={onDismissReview}
                    className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-rose-900/40 text-slate-400 hover:text-rose-200 rounded-xl text-xs font-medium transition"
                  >
                    {t('audio_confirm_cancel', currentLang)}
                  </button>
                )}
              </div>

              {/* Big Green Confirm & Translate Button */}
              <button
                type="button"
                onClick={handleConfirmReviewSend}
                disabled={isProcessing || !editableReviewText.trim()}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
              >
                <span>{t('audio_confirm_send', currentLang)}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Input Bar & Controls Row */}
        <div className="flex items-center gap-2">
          {/* Quick Text Input for Messenger-style typing */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
              placeholder={t('audio_input_placeholder', currentLang)}
              className="w-full px-4 py-3 bg-slate-800/90 border border-slate-700/80 rounded-2xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-transparent transition"
            />
          </div>

          {/* Send Button (if text entered) */}
          {inputText.trim().length > 0 && (
            <button
              onClick={handleSend}
              disabled={isProcessing}
              title={t('audio_send_tooltip', currentLang)}
              className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl shadow-lg shadow-blue-500/25 transition active:scale-95 shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          )}

          {/* Big Voice Button (PTT) */}
          <button
            disabled={isLockedByOther || isProcessing}
            onClick={() => {
              if (isRecording) {
                onStopManualRecord(false);
              } else {
                onStartManualRecord();
              }
            }}
            title={isRecording ? t('audio_stop_and_translate', currentLang) : t('audio_click_to_speak', currentLang)}
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
                <span className="hidden sm:inline">{lockState.speakerName || t('audio_mic_busy', currentLang)}</span>
              </>
            ) : isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{t('ptt_processing', currentLang)}</span>
              </>
            ) : isRecording ? (
              <>
                <Square className="w-4 h-4 fill-current animate-bounce" />
                <span>{t('audio_stop_and_translate_sec', currentLang, { sec: recordDuration })}</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>{t('audio_click_to_speak', currentLang)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
