import React, { useEffect, useRef } from 'react';
import { Volume2, VolumeX, MessageSquare, Globe, Trash2 } from 'lucide-react';
import type { Language, TranslationMessage } from '../types';
import { t } from '../locales/i18n';

interface ChatFeedProps {
  messages: TranslationMessage[];
  currentUserId: string;
  currentLang: Language;
  onPlayAudio: (text: string, lang: Language) => void;
  speakingMessageId: string | null;
  onDeleteMessage?: (id: string) => void;
}

// Generate consistent avatar colors based on sender name
const getAvatarColor = (name: string) => {
  const colors = [
    'from-emerald-500 to-teal-600',
    'from-purple-500 to-indigo-600',
    'from-amber-500 to-orange-600',
    'from-pink-500 to-rose-600',
    'from-cyan-500 to-blue-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const ChatFeed: React.FC<ChatFeedProps> = ({
  messages,
  currentUserId,
  currentLang,
  onPlayAudio,
  speakingMessageId,
  onDeleteMessage,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
        <div className="w-16 h-16 rounded-3xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center mb-3.5 text-blue-400 shadow-xl shadow-blue-500/5">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-white mb-1.5">
          {t('chat_empty_title', currentLang)}
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
          {t('chat_empty_desc', currentLang)}
        </p>
        <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-2xl text-xs text-slate-300 max-w-xs">
          <p className="text-[11px] text-slate-400 leading-normal">
            {t('chat_empty_tip', currentLang)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          // Translated text matches current device's selected language
          const translatedText = msg.translations[currentLang] || msg.originalText;
          const isPlaying = speakingMessageId === msg.id;
          const firstChar = (msg.senderName || 'U').charAt(0).toUpperCase();

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {/* Partner Avatar (Left Side only for other people) */}
              {!isMe && (
                <div
                  className={`w-8 h-8 rounded-full bg-gradient-to-tr ${getAvatarColor(
                    msg.senderName
                  )} flex items-center justify-center text-white text-xs font-bold shadow-md shrink-0 mb-1`}
                  title={msg.senderName}
                >
                  {firstChar}
                </div>
              )}

              {/* Message Content Container */}
              <div className={`flex flex-col max-w-[85%] sm:max-w-md ${isMe ? 'items-end' : 'items-start'}`}>
                {/* Sender Name (above bubble for others) */}
                {!isMe && (
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">{msg.senderName}</span>
                    <span>•</span>
                    <span className="text-[10px] uppercase font-mono px-1 py-0.2 bg-slate-800 rounded border border-slate-700">
                      {msg.detectedLang}
                    </span>
                  </div>
                )}

                {/* Messenger-style Chat Bubble */}
                <div
                  className={`relative rounded-2xl px-4 py-2.5 shadow-md border text-left transition-all ${
                    isMe
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500/60 rounded-br-sm'
                      : 'bg-slate-800/95 text-slate-100 border-slate-700/80 rounded-bl-sm'
                  }`}
                >
                  {/* Primary Translated Text */}
                  <div className="text-[15px] sm:text-base leading-snug font-normal select-text">
                    {translatedText}
                  </div>

                  {/* Subtext: Original Spoken Text (gray italic for terminology cross-referencing) */}
                  {msg.originalText && msg.originalText !== translatedText && (
                    <div
                      className={`mt-2 pt-1.5 border-t text-xs italic ${
                        isMe ? 'border-blue-400/30 text-blue-100/80' : 'border-slate-700/80 text-slate-400'
                      }`}
                    >
                      <span className="font-mono text-[10px] not-italic mr-1 opacity-70">
                        {t('chat_original_prefix', currentLang)}
                      </span>
                      "{msg.originalText}"
                    </div>
                  )}

                  {/* Bubble Footer: Language tag & Re-play audio button */}
                  <div
                    className={`mt-2 flex items-center justify-between text-[11px] pt-1 border-t ${
                      isMe ? 'border-white/15 text-blue-200' : 'border-slate-700/60 text-slate-400'
                    }`}
                  >
                    <span className="text-[10px] opacity-80 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {msg.detectedLang.toUpperCase()} → {currentLang.toUpperCase()}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isMe && onDeleteMessage && (
                        <button
                          onClick={() => onDeleteMessage(msg.id)}
                          title="Thu hồi / Xóa câu này nếu AI nghe sai"
                          className="p-1 px-1.5 rounded-lg hover:bg-rose-600/30 text-rose-300 hover:text-white transition flex items-center gap-1 text-[10px]"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Thu hồi</span>
                        </button>
                      )}

                      <button
                        onClick={() => onPlayAudio(translatedText, currentLang)}
                        title="Bấm để nghe đọc lại câu thoại"
                        className={`p-1 px-1.5 rounded-lg transition flex items-center gap-1 text-[11px] font-medium ${
                          isMe
                            ? 'hover:bg-blue-700/70 text-blue-100'
                            : 'hover:bg-slate-700 text-slate-300'
                        } ${isPlaying ? 'animate-pulse text-amber-300' : ''}`}
                      >
                        {isPlaying ? (
                          <>
                            <VolumeX className="w-3 h-3" />
                            <span>{t('chat_speaking_btn', currentLang)}</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>{t('chat_speak_btn', currentLang)}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Timestamp below bubble */}
                <div className={`mt-0.5 px-1 text-[10px] text-slate-500 font-mono ${isMe ? 'text-right' : 'text-left'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
