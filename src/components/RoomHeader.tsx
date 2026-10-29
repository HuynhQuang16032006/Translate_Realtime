import React from 'react';
import { QrCode, Headphones, Volume2, Mic, Hand, Sliders, Wifi, WifiOff } from 'lucide-react';
import type { ConnectionStatus, Language, OperationMode } from '../types';

interface RoomHeaderProps {
  roomId: string;
  connectionStatus: ConnectionStatus;
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  mode: OperationMode;
  onModeToggle: () => void;
  hasHeadphones: boolean;
  onHeadphonesToggle: () => void;
  onOpenQr: () => void;
  onOpenCalibration: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  roomId,
  connectionStatus,
  currentLang,
  onLanguageChange,
  mode,
  onModeToggle,
  hasHeadphones,
  onHeadphonesToggle,
  onOpenQr,
  onOpenCalibration,
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
                  China Expo
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <span>Phòng:</span>
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
                  <Wifi className="w-3 h-3" /> Trực tuyến
                </span>
              </>
            ) : connectionStatus === 'reconnecting' || connectionStatus === 'connecting' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="text-amber-400">Đang nối lại...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span className="text-rose-400 flex items-center gap-1">
                  <WifiOff className="w-3 h-3" /> Mất kết nối
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
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="vi">🇻🇳 Tiếng Việt</option>
              <option value="zh">🇨🇳 中文 (简体)</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </div>

          {/* Mode Switch: VAD vs PTT */}
          <button
            onClick={onModeToggle}
            title={mode === 'vad' ? 'Chế độ: Rảnh tay tự động (Auto VAD)' : 'Chế độ: Chạm để nói (Push-to-Talk)'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition shrink-0 ${
              mode === 'vad'
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/30 hover:bg-blue-600/30'
                : 'bg-amber-600/20 text-amber-300 border-amber-500/30 hover:bg-amber-600/30'
            }`}
          >
            {mode === 'vad' ? (
              <>
                <Mic className="w-3.5 h-3.5 text-blue-400" />
                <span>Rảnh tay (VAD)</span>
              </>
            ) : (
              <>
                <Hand className="w-3.5 h-3.5 text-amber-400" />
                <span>Chạm nói (PTT)</span>
              </>
            )}
          </button>

          {/* Headphone Anti-Echo Mode Toggle */}
          <button
            onClick={onHeadphonesToggle}
            title={hasHeadphones ? 'Chế độ Tai nghe: Bật (Tự động đọc bản dịch)' : 'Chế độ Loa ngoài: Tắt (Chỉ hiện văn bản, chống lặp âm)'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition shrink-0 ${
              hasHeadphones
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300'
            }`}
          >
            {hasHeadphones ? (
              <>
                <Headphones className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tai nghe: Bật</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Loa ngoài</span>
              </>
            )}
          </button>

          {/* Noise Calibration Button */}
          {mode === 'vad' && (
            <button
              onClick={onOpenCalibration}
              title="Cân chỉnh lọc ồn gian hàng máy móc"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition shrink-0"
            >
              <Sliders className="w-4 h-4" />
            </button>
          )}

          {/* QR Code Share Button */}
          <button
            onClick={onOpenQr}
            title="Mã QR mời đối tác tham gia"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition text-xs font-semibold shadow-sm shrink-0"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Mã QR</span>
          </button>
        </div>
      </div>
    </header>
  );
};
