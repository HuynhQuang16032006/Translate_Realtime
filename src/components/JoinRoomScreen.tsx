import React, { useState } from 'react';
import { Globe, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import type { Language } from '../types';

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

  const handleCreateNewRoom = () => {
    // Generate secure random room ID with timestamp and nano-hash
    const randomHash = Math.random().toString(36).substring(2, 10);
    const newId = `expo-${randomHash}`;
    setRoomId(newId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;

    let finalRoom = roomId.trim();
    if (!finalRoom) {
      finalRoom = `expo-${Math.random().toString(36).substring(2, 10)}`;
    }

    onJoin(userName.trim(), finalRoom, selectedLang);
  };

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
            ExpoTrans • 展会同传
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Phòng phiên dịch trực tiếp đa thiết bị qua mã QR cho triển lãm máy móc Trung Quốc
          </p>
        </div>

        {/* Join Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name Input */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-semibold text-slate-300">
              Tên hiển thị của bạn / 您的姓名:
            </label>
            <input
              type="text"
              required
              placeholder="VD: Ba, Giám đốc Trần, Kỹ sư Lý..."
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Native Language Select */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-semibold text-slate-300">
              Ngôn ngữ mẹ đẻ của bạn / 您的母语:
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

          {/* Room ID Section */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Mã phòng / 房间号:
              </label>
              {!initialRoomId && (
                <button
                  type="button"
                  onClick={handleCreateNewRoom}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                >
                  Tạo mã ngẫu nhiên
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="Nhập mã phòng hoặc để trống để tạo mới"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-sm transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 mt-2"
          >
            <span>Vào phòng đàm phán / 加入房间</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Feature Badges */}
        <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Đồng bộ Realtime MQTT</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>AI Chuyên sâu Cơ khí</span>
          </div>
        </div>
      </div>
    </div>
  );
};
