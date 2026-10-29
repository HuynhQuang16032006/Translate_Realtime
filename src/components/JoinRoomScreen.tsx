import React, { useState, useEffect } from 'react';
import { Globe, ArrowRight, Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react';
import type { Language } from '../types';
import { t } from '../locales/i18n';

interface JoinRoomScreenProps {
  initialRoomId: string;
  onJoin: (userName: string, roomId: string, lang: Language) => void;
}

export const JoinRoomScreen: React.FC<JoinRoomScreenProps> = ({
  initialRoomId,
  onJoin,
}) => {
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState(initialRoomId || '');
  const [selectedLang, setSelectedLang] = useState<Language>('vi');

  // Detect URL parameter whenever initialRoomId changes
  useEffect(() => {
    if (initialRoomId) {
      setRoomId(initialRoomId);
    }
  }, [initialRoomId]);

  const handleCreateNewRoom = () => {
    const randomHash = Math.random().toString(36).substring(2, 9);
    const newId = `room-${randomHash}`;
    setRoomId(newId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;

    let finalRoom = roomId.trim();
    if (!finalRoom) {
      finalRoom = `room-${Math.random().toString(36).substring(2, 9)}`;
    }

    onJoin(userName.trim(), finalRoom, selectedLang);
  };

  const isScannedRoom = Boolean(initialRoomId);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100 safe-bottom safe-top">
      {/* Decorative gradient blur */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* App Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20 mb-1">
            <Globe className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {t('app_title', selectedLang)}
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {t('app_subtitle', selectedLang)}
          </p>
        </div>

        {/* QR Scan Pre-filled Notice */}
        {isScannedRoom && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="truncate">
              <span className="font-semibold block">{t('joining_room_badge', selectedLang)}</span>
              <span className="font-mono text-white text-[13px]">{roomId}</span>
            </div>
          </div>
        )}

        {/* Join Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name Input */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-semibold text-slate-300">
              {t('your_name_label', selectedLang)}
            </label>
            <input
              type="text"
              required
              placeholder={t('your_name_placeholder', selectedLang)}
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              autoFocus
            />
          </div>

          {/* Native Language Select */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-semibold text-slate-300">
              {t('your_lang_label', selectedLang)}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedLang('vi')}
                className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition flex flex-col items-center gap-1 ${
                  selectedLang === 'vi'
                    ? 'bg-blue-600/20 border-blue-500 text-white font-semibold'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-base">🇻🇳</span>
                <span>Tiếng Việt</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedLang('zh')}
                className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition flex flex-col items-center gap-1 ${
                  selectedLang === 'zh'
                    ? 'bg-blue-600/20 border-blue-500 text-white font-semibold'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-base">🇨🇳</span>
                <span>中文 (简体)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedLang('en')}
                className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition flex flex-col items-center gap-1 ${
                  selectedLang === 'en'
                    ? 'bg-blue-600/20 border-blue-500 text-white font-semibold'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-base">🇬🇧</span>
                <span>English</span>
              </button>
            </div>
          </div>

          {/* Room ID Section: Only show manual input if not scanned from QR */}
          {!isScannedRoom && (
            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  {t('room_code_label', selectedLang)}
                </label>
                <button
                  type="button"
                  onClick={handleCreateNewRoom}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                >
                  {t('generate_random_room', selectedLang)}
                </button>
              </div>
              <input
                type="text"
                placeholder={t('room_placeholder', selectedLang)}
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-sm transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 mt-2"
          >
            <span>
              {isScannedRoom
                ? t('join_submit_btn', selectedLang)
                : roomId
                ? t('join_submit_btn', selectedLang)
                : t('create_and_join_btn', selectedLang)}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Feature Badges */}
        <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{t('feature_realtime_mqtt', selectedLang)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{t('feature_ai_specialized', selectedLang)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
