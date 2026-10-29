import React from 'react';
import { Volume2, X } from 'lucide-react';
import type { Language } from '../types';
import { t } from '../locales/i18n';

interface LiveSpeechPopupProps {
  speakerName: string;
  translatedText: string;
  originalText?: string;
  currentLang: Language;
  isVisible: boolean;
  onDismiss: () => void;
}

export const LiveSpeechPopup: React.FC<LiveSpeechPopupProps> = ({
  speakerName,
  translatedText,
  originalText,
  currentLang,
  isVisible,
  onDismiss,
}) => {
  if (!isVisible || !translatedText) return null;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-lg animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
      <div className="bg-slate-900/95 border-2 border-blue-500/80 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl ring-4 ring-blue-500/20 text-white">
        <div className="flex items-start justify-between gap-3">
          {/* Pulsing Speaker Icon */}
          <div className="p-2 bg-blue-600/30 text-blue-400 rounded-xl shrink-0 mt-0.5 border border-blue-500/40">
            <Volume2 className="w-5 h-5 animate-pulse" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-xs text-blue-300 truncate">{speakerName}</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/20 text-blue-200 border border-blue-500/30 rounded-full font-medium">
                {t('just_spoke', currentLang)}
              </span>
            </div>

            {/* Translated speech text (in device's selected language) */}
            <p className="text-sm sm:text-base font-semibold text-white leading-snug break-words">
              {translatedText}
            </p>

            {/* Original text subtext if different */}
            {originalText && originalText !== translatedText && (
              <p className="text-xs text-slate-400 mt-1 italic truncate">
                <span className="not-italic opacity-70 mr-1">{t('chat_original_prefix', currentLang)}</span>
                "{originalText}"
              </p>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={onDismiss}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar animation */}
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-2.5">
          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 animate-[pulse_1.5s_infinite]" />
        </div>
      </div>
    </div>
  );
};
