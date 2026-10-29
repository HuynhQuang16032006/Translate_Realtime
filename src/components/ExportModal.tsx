import React, { useState } from 'react';
import { X, Download, Copy, Check, FileText, Printer } from 'lucide-react';
import type { Language, TranslationMessage } from '../types';
import { t } from '../locales/i18n';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: TranslationMessage[];
  roomId: string;
  currentLang: Language;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  messages,
  roomId,
  currentLang,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getFullFormattedText = () => {
    const lines: string[] = [
      '==================================================',
      '        BIÊN BẢN HỘI THOẠI PHIÊN DỊCH - EXPOTRANS',
      `        Phòng: ${roomId}`,
      `        Thời gian xuất: ${new Date().toLocaleString()}`,
      `        Tổng số câu đàm thoại: ${messages.length}`,
      '==================================================\n',
    ];

    messages.forEach((msg, idx) => {
      const timeStr = formatDate(msg.timestamp);
      const translated = msg.translations[currentLang] || msg.originalText;
      lines.push(`[${idx + 1}] (${timeStr}) ${msg.senderName} [${msg.detectedLang.toUpperCase()}]:`);
      lines.push(`     Gốc: "${msg.originalText}"`);
      if (translated !== msg.originalText) {
        lines.push(`  -> Dịch (${currentLang.toUpperCase()}): "${translated}"`);
      }
      lines.push('');
    });

    lines.push('==================================================');
    lines.push('Được tạo bởi hệ thống phiên dịch ExpoTrans (transrealtime.online)');
    return lines.join('\n');
  };

  const handleDownloadTxt = () => {
    const content = getFullFormattedText();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HoiThoai_${roomId}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyAll = async () => {
    try {
      const content = getFullFormattedText();
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.warn('Lỗi copy:', e);
    }
  };

  const handleDownloadHtmlReport = () => {
    const rowsHtml = messages
      .map((msg, idx) => {
        const timeStr = formatDate(msg.timestamp);
        const translated = msg.translations[currentLang] || msg.originalText;
        return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; font-size: 12px; color: #64748b; white-space: nowrap;">#${idx + 1} (${timeStr})</td>
          <td style="padding: 10px; font-weight: bold; color: #1e293b; white-space: nowrap;">${msg.senderName}</td>
          <td style="padding: 10px; color: #334155; font-size: 14px;">
            <div style="font-weight: 500;">${msg.originalText}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Ngôn ngữ: ${msg.detectedLang.toUpperCase()}</div>
          </td>
          <td style="padding: 10px; color: #0f172a; font-size: 14px; font-weight: 600; background: #f8fafc;">
            ${translated}
          </td>
        </tr>`;
      })
      .join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Biên bản hội thoại - Phòng ${roomId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; max-width: 900px; margin: 0 auto; color: #0f172a; line-height: 1.5; }
    .header { border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 24px; font-weight: bold; color: #1e3a8a; margin: 0 0 5px 0; }
    .meta { font-size: 13px; color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { text-align: left; padding: 10px; background: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-size: 12px; text-transform: uppercase; color: #475569; }
    .btn-print { background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">ExpoTrans - Biên Bản Hội Thoại Phiên Dịch</h1>
      <div class="meta">Mã phòng: <strong>${roomId}</strong> • Ngày xuất: ${new Date().toLocaleString()} • Tổng: ${messages.length} câu thoại</div>
    </div>
    <div class="no-print">
      <button class="btn-print" onclick="window.print()">🖨️ In / Lưu thành PDF</button>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 15%;">Thời gian</th>
        <th style="width: 20%;">Người nói</th>
        <th style="width: 35%;">Nội dung gốc</th>
        <th style="width: 30%;">Bản dịch (${currentLang.toUpperCase()})</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
  <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px;">
    Hệ thống phiên dịch thời gian thực ExpoTrans • transrealtime.online
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BaoCao_HoiThoai_${roomId}_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t('export_title', currentLang)}</h3>
              <p className="text-xs text-slate-400">
                {t('export_total_msgs', currentLang, { count: messages.length })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subtitle */}
        <p className="text-xs text-slate-300 leading-relaxed">
          {t('export_subtitle', currentLang)}
        </p>

        {/* Message count alert */}
        {messages.length === 0 ? (
          <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60 text-center text-slate-400 text-xs">
            {t('export_empty', currentLang)}
          </div>
        ) : (
          /* Export Options Cards */
          <div className="space-y-3">
            {/* Option 1: Download TXT (Recommended) */}
            <button
              onClick={handleDownloadTxt}
              className="w-full p-4 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 border border-blue-500/40 rounded-2xl flex items-center justify-between transition group text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <div className="font-semibold text-sm text-white flex items-center gap-1.5">
                    <span>{t('export_txt_btn', currentLang)}</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/30 text-blue-300 rounded font-normal">
                      Khuyên dùng
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 truncate mt-0.5">
                    {t('export_txt_desc', currentLang)}
                  </div>
                </div>
              </div>
              <Download className="w-4 h-4 text-blue-400 shrink-0 group-hover:translate-y-0.5 transition" />
            </button>

            {/* Option 2: Copy to Clipboard */}
            <button
              onClick={handleCopyAll}
              className="w-full p-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl flex items-center justify-between transition text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-slate-700 text-slate-200 rounded-xl shrink-0">
                  {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </div>
                <div className="truncate">
                  <div className="font-semibold text-sm text-white">
                    {copied ? t('export_copied', currentLang) : t('export_copy_btn', currentLang)}
                  </div>
                  <div className="text-xs text-slate-400 truncate mt-0.5">
                    Dán nhanh vào ứng dụng Ghi chú, Zalo, WeChat
                  </div>
                </div>
              </div>
              {copied ? (
                <span className="text-xs font-semibold text-emerald-400 shrink-0">✓ Đã chép</span>
              ) : (
                <Copy className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </button>

            {/* Option 3: Download HTML Report for PDF Printing */}
            <button
              onClick={handleDownloadHtmlReport}
              className="w-full p-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl flex items-center justify-between transition text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-slate-700 text-slate-200 rounded-xl shrink-0">
                  <Printer className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <div className="font-semibold text-sm text-white">
                    {t('export_html_btn', currentLang)}
                  </div>
                  <div className="text-xs text-slate-400 truncate mt-0.5">
                    {t('export_html_desc', currentLang)}
                  </div>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-2xl transition text-xs"
          >
            {t('export_close', currentLang)}
          </button>
        </div>
      </div>
    </div>
  );
};
