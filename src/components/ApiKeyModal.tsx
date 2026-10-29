import React, { useState } from 'react';
import { Key, X, Check, ExternalLink, ShieldCheck } from 'lucide-react';
import type { Language } from '../types';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  onSaveKey: (key: string) => void;
  savedKey: string;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  onSaveKey,
  savedKey,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState(savedKey);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveKey(apiKeyInput.trim());
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  const isVi = currentLang === 'vi';
  const isZh = currentLang === 'zh';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {isVi ? 'Cấu hình Gemini API Key' : isZh ? '配置 Gemini API 密钥' : 'Gemini API Key Settings'}
            </h3>
            <p className="text-xs text-slate-400">
              {isVi
                ? 'Tự do thay đổi khóa API cá nhân hoặc tổ chức'
                : isZh
                ? '自由更换个人或企业的 Google API 密钥'
                : 'Custom Google GenAI API Key for unlimited usage'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              API Key (AIzaSy...)
            </label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Dán mã API Key của bạn vào đây..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="p-3.5 bg-blue-950/40 border border-blue-500/30 rounded-2xl text-xs space-y-2">
            <div className="flex items-start gap-2 text-blue-200">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                {isVi
                  ? 'Mẹo: Google AI Studio cho phép tạo API Key miễn phí không giới hạn trong 10 giây.'
                  : isZh
                  ? '提示：Google AI Studio 允许在 10 秒内免费创建 API Key。'
                  : 'Tip: You can create a free API key at Google AI Studio in 10 seconds.'}
              </span>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-semibold underline"
            >
              <span>{isVi ? 'Lấy khóa API miễn phí tại đây' : isZh ? '在此处获取免费 API 密钥' : 'Get free API Key here'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              {isVi ? 'Đóng' : isZh ? '关闭' : 'Cancel'}
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 transition flex items-center gap-1.5"
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>{isVi ? 'Đã lưu!' : isZh ? '已保存！' : 'Saved!'}</span>
                </>
              ) : (
                <span>{isVi ? 'Lưu khóa API' : isZh ? '保存密钥' : 'Save Key'}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
