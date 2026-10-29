import React, { useState, useEffect } from 'react';
import { ExternalLink, CornerRightUp, AlertTriangle } from 'lucide-react';

export const WeChatDetector: React.FC = () => {
  const [isWeChat, setIsWeChat] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('micromessenger')) {
        setIsWeChat(true);
      }
    }
  }, []);

  if (!isWeChat || isDismissed) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-start bg-slate-950/95 backdrop-blur-md p-6 text-white safe-top">
      {/* Top right indicator arrow pointing to WeChat ... menu */}
      <div className="w-full flex justify-end pr-2 pt-1 animate-bounce">
        <div className="flex items-center gap-2 bg-amber-500 text-slate-950 px-3 py-1.5 rounded-full font-bold text-xs shadow-lg">
          <span>点击右上角 【 ··· 】</span>
          <CornerRightUp className="w-4 h-4" />
        </div>
      </div>

      <div className="max-w-md w-full mt-8 bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">微信环境访问提示 / Notice</h3>
            <p className="text-xs text-slate-400">WeChat In-App Browser Detected</p>
          </div>
        </div>

        {/* Chinese Instructions */}
        <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/60 text-sm leading-relaxed text-slate-200 space-y-2">
          <p className="font-medium text-amber-300">
            为保证麦克风语音录制与实时同传功能正常：
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-300 text-xs sm:text-sm">
            <li>点击屏幕右上角菜单 <strong>【 ··· 】</strong></li>
            <li>在弹出菜单中选择 <strong>【在默认浏览器打开】</strong> (Safari / Chrome / 系统自带浏览器)</li>
          </ol>
        </div>

        {/* Vietnamese Instructions */}
        <div className="text-xs text-slate-400 leading-relaxed space-y-1 border-t border-slate-800 pt-3">
          <p className="font-semibold text-slate-300">Hướng dẫn cho người dùng mở bằng WeChat:</p>
          <p>
            Vui lòng nhấn vào dấu ba chấm <strong>【 ··· 】</strong> ở góc trên bên phải và chọn <strong>"Mở bằng trình duyệt"</strong> (Safari / Chrome) để cấp quyền Micro.
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={() => setIsDismissed(true)}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition flex items-center justify-center gap-2 border border-slate-700"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Đã mở trình duyệt ngoài / Tiếp tục (Continue)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
