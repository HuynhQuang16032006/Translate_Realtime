import React, { useEffect, useRef } from 'react';
import { Volume2, VolumeX, Globe } from 'lucide-react';
import type { Language, TranslationMessage } from '../types';

interface ChatFeedProps {
  messages: TranslationMessage[];
  currentUserId: string;
  currentLang: Language;
  onPlayAudio: (text: string, lang: Language) => void;
  speakingMessageId: string | null;
}

export const ChatFeed: React.FC<ChatFeedProps> = ({
  messages,
  currentUserId,
  currentLang,
  onPlayAudio,
  speakingMessageId,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const langLabels: Record<Language, string> = {
    vi: 'Tiếng Việt',
    zh: '中文',
    en: 'English',
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
        <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mb-3 text-blue-400">
          <Globe className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-white mb-1">Phòng hội thoại đã sẵn sàng</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
          Đưa máy lại gần miệng để nói (hoặc nhấn giữ nút micro). AI sẽ tự động lọc tiếng ồn máy móc và dịch sang ngôn ngữ của từng người.
        </p>
        <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-xs text-slate-300 max-w-xs space-y-1">
          <p className="font-medium text-blue-400">💡 Mẹo tại triển lãm:</p>
          <p className="text-[11px] text-slate-400">
            Bấm nút <strong>Mã QR</strong> góc trên để đối tác Trung Quốc quét máy tham gia ngay lập tức.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
      <div className="max-w-3xl mx-auto space-y-3.5">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          const translatedText = msg.translations[currentLang] || msg.originalText;
          const isPlaying = speakingMessageId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              {/* Speaker Header */}
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">{isMe ? 'Bạn' : msg.senderName}</span>
                <span>•</span>
                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="px-1.5 py-0.2 bg-slate-800 border border-slate-700 text-[10px] rounded text-slate-400">
                  {msg.detectedLang.toUpperCase()}
                </span>
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[88%] sm:max-w-md rounded-2xl px-4 py-3 shadow-md border ${
                  isMe
                    ? 'bg-blue-600 text-white border-blue-500 rounded-br-sm'
                    : 'bg-slate-800 text-slate-100 border-slate-700/80 rounded-bl-sm'
                }`}
              >
                {/* Main Translated Text (Standard 15px-16px, readable and clear) */}
                <div className="text-[15px] sm:text-base leading-snug font-normal">
                  {translatedText}
                </div>

                {/* Subtext: Original Spoken Text (Gray small text for cross-referencing technical terms) */}
                {msg.originalText && msg.originalText !== translatedText && (
                  <div
                    className={`mt-2 pt-2 border-t text-xs italic ${
                      isMe ? 'border-blue-500/60 text-blue-100/80' : 'border-slate-700 text-slate-400'
                    }`}
                  >
                    <span className="font-mono text-[10px] not-italic mr-1 opacity-70">Gốc:</span>
                    "{msg.originalText}"
                  </div>
                )}

                {/* Action Footer: Audio playback button */}
                <div className="mt-2.5 flex items-center justify-between text-xs pt-1 border-t border-white/10">
                  <span className={`text-[10px] ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                    Dịch: {langLabels[currentLang]}
                  </span>

                  <button
                    onClick={() => onPlayAudio(translatedText, currentLang)}
                    title="Bấm để nghe đọc bản dịch (Offline Speech TTS)"
                    className={`p-1 rounded-md transition flex items-center gap-1 text-[11px] font-medium ${
                      isMe
                        ? 'hover:bg-blue-700 text-blue-100'
                        : 'hover:bg-slate-700 text-slate-300'
                    } ${isPlaying ? 'animate-pulse text-amber-300' : ''}`}
                  >
                    {isPlaying ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>Đang đọc...</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Phát âm</span>
                      </>
                    )}
                  </button>
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
