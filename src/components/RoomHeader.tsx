import React from 'react';
import { QrCode, Volume2, VolumeX, Download, LogOut, Wifi, WifiOff } from 'lucide-react';
import type { ConnectionStatus, Language } from '../types';
import { t } from '../locales/i18n';

interface RoomHeaderProps {
  roomId: string;
  connectionStatus: ConnectionStatus;
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  autoSpeak: boolean;
  onAutoSpeakToggle: () => void;
  onOpenQr: () => void;
  onOpenExport: () => void;
  onLeaveRoom: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  roomId,
  connectionStatus,
  currentLang,
  onLanguageChange,
  autoSpeak,
  onAutoSpeakToggle,
  onOpenQr,
  onOpenExport,
  onLeaveRoom,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 safe-top px-4 py-2.5">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Left Section: Logo & Room info & Status */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20 text-sm">
              ET
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white tracking-tight">ExpoTrans</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                  {t('app_badge', currentLang)}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <span>{t('room_label', currentLang)}</span>
                <span className="font-mono text-slate-300 font-semibold">{roomId.slice(0, 10)}</span>
              </div>
            </div>
          </div>

          {/* Connection Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-slate-800/80 shrink-0">
            {connectionStatus === 'connected' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <Wifi className="w-3 h-3" /> {t('status_online', currentLang)}
                </span>
              </>
            ) : connectionStatus === 'reconnecting' || connectionStatus === 'connecting' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="text-amber-400">{t('status_reconnecting', currentLang)}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span className="text-rose-400 flex items-center gap-1">
                  <WifiOff className="w-3 h-3" /> {t('status_offline', currentLang)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right Section: Controls & Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end overflow-x-auto pb-1 sm:pb-0">
          {/* Language Selector */}
          <div className="relative shrink-0">
            <select
              value={currentLang}
              onChange={(e) => onLanguageChange(e.target.value as Language)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="vi">🇻🇳 Tiếng Việt</option>
              <option value="zh">🇨🇳 中文 (简体)</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </div>

          {/* Auto-Speech Toggle (Default ON for instant speech playback) */}
          <button
            onClick={onAutoSpeakToggle}
            title={t('auto_speak_tooltip', currentLang)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition shrink-0 ${
              autoSpeak
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300'
            }`}
          >
            {autoSpeak ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>{t('auto_speak_on', currentLang)}</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                <span>{t('auto_speak_off', currentLang)}</span>
              </>
            )}
          </button>

          {/* Export / Save Conversation Button */}
          <button
            onClick={onOpenExport}
            title={t('btn_export', currentLang)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition text-xs font-semibold shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t('btn_export', currentLang)}</span>
          </button>

          {/* QR Code Share Button */}
          <button
            onClick={onOpenQr}
            title={t('btn_qr', currentLang)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition text-xs font-semibold shadow-sm shrink-0"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>{t('btn_qr', currentLang)}</span>
          </button>

          {/* Leave Room Button */}
          <button
            onClick={onLeaveRoom}
            title={t('btn_leave', currentLang)}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
