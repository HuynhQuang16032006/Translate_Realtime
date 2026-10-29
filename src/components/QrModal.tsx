import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Users, Sparkles } from 'lucide-react';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

export const QrModal: React.FC<QrModalProps> = ({ isOpen, onClose, roomId }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const roomUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?room=${roomId}`
    : `https://expotrans.app/?room=${roomId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(roomUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-center gap-2 mb-2 text-blue-400">
          <Users className="w-5 h-5" />
          <h2 className="text-base font-semibold text-white">Mã QR Tham gia Phòng</h2>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          Quét bằng điện thoại để kết nối phiên dịch trực tiếp
          <br />
          <span className="text-slate-300">扫码立即加入现场同传房间</span>
        </p>

        {/* QR Code Container */}
        <div className="bg-white p-4 rounded-xl inline-block shadow-inner mx-auto mb-5 border-4 border-slate-800">
          <QRCodeSVG
            value={roomUrl}
            size={220}
            level="M"
            includeMargin={true}
          />
        </div>

        {/* Room Info & Direct Link */}
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-left">
            <div className="truncate mr-2">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Mã phòng / Room ID:</span>
              <span className="font-mono text-slate-200 font-medium truncate block">{roomId}</span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition text-xs font-medium shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã sao chép' : 'Sao chép link'}</span>
            </button>
          </div>

          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-300 flex items-center justify-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Kết nối đồng bộ thời gian thực qua giao thức MQTT bảo mật</span>
          </div>
        </div>
      </div>
    </div>
  );
};
