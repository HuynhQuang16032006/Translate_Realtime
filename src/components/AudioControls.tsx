import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Square, Radio, Sliders } from 'lucide-react';
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
  onOpenCalibration: () => void;
  vadThresholdDb: number;
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
  onOpenCalibration,
  vadThresholdDb,
}) => {
  const isLockedByOther = lockState.isLocked && lockState.lockedBy !== currentUserId;
  const [recordDuration, setRecordDuration] = useState(0);

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

  return (
    <div className="bg-slate-900/95 border-t border-slate-800 safe-bottom px-4 py-3">
      <div className="max-w-md mx-auto flex flex-col items-center justify-center gap-2">
        {mode === 'ptt' ? (
          /* Push-to-Talk (PTT) Mode Controls */
          <div className="w-full flex flex-col items-center gap-2">
            <button
              disabled={isLockedByOther || isProcessing}
              onClick={() => {
                if (isRecording) {
                  onStopManualRecord();
                } else {
                  onStartManualRecord();
                }
              }}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-sm sm:text-base transition-all shadow-lg flex items-center justify-center gap-3 select-none active:scale-[0.98] ${
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
                  <MicOff className="w-5 h-5 text-slate-500" />
                  <span>{t('ptt_locked', currentLang, { name: lockState.speakerName || '' })}</span>
                </>
              ) : isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t('ptt_processing', currentLang)}</span>
                </>
              ) : isRecording ? (
                <>
                  <Square className="w-5 h-5 fill-current animate-bounce" />
                  <span>{t('ptt_recording', currentLang, { sec: recordDuration })}</span>
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  <span>{t('ptt_idle', currentLang)}</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-slate-400">
              {t('ptt_hint', currentLang)}
            </p>
          </div>
        ) : (
          /* Auto VAD Mode Controls */
          <div className="w-full flex items-center justify-between bg-slate-800/80 border border-slate-700/80 rounded-2xl px-4 py-2.5">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl transition ${
                  isRecording
                    ? 'bg-emerald-500/20 text-emerald-400 animate-pulse'
                    : isLockedByOther
                    ? 'bg-rose-500/10 text-rose-400'
                    : 'bg-blue-500/10 text-blue-400'
                }`}
              >
                {isRecording ? (
                  <Mic className="w-5 h-5 text-emerald-400" />
                ) : isLockedByOther ? (
                  <MicOff className="w-5 h-5 text-rose-400" />
                ) : (
                  <Radio className="w-5 h-5 text-blue-400" />
                )}
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-200">
                  {isRecording
                    ? t('vad_active_title', currentLang)
                    : isLockedByOther
                    ? t('ptt_locked', currentLang, { name: lockState.speakerName || '' })
                    : t('vad_idle_title', currentLang)}
                </div>
                <div className="text-[11px] text-slate-400">
                  {t('vad_threshold_info', currentLang, { db: vadThresholdDb })}
                </div>
              </div>
            </div>

            <button
              onClick={onOpenCalibration}
              className="p-2 bg-slate-700/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition flex items-center gap-1.5 border border-slate-600"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">{t('vad_calibrate_btn', currentLang)}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
