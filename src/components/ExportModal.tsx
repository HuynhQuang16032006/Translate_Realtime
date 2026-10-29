import React, { useState, useRef } from 'react';
import { X, Download, Copy, Check, FileText, Printer, FileDown, Loader2, Sparkles } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Language, TranslationMessage } from '../types';
import { t } from '../locales/i18n';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: TranslationMessage[];
  roomId: string;
  currentLang: Language;
  currentUserId?: string;
}

// Generate consistent avatar colors based on sender name
const getAvatarGradient = (name: string) => {
  const gradients = [
    'linear-gradient(135deg, #10b981, #0d9488)',
    'linear-gradient(135deg, #8b5cf6, #4f46e5)',
    'linear-gradient(135deg, #f59e0b, #ea580c)',
    'linear-gradient(135deg, #ec4899, #e11d48)',
    'linear-gradient(135deg, #06b6d4, #2563eb)',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
};

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  messages,
  roomId,
  currentLang,
  currentUserId,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getFullFormattedText = () => {
    const lines: string[] = [
      '==================================================',
      `        ${t('export_pdf_doc_title', currentLang)}`,
      `        ${t('export_pdf_doc_room', currentLang)}: ${roomId}`,
      `        ${t('export_pdf_doc_time', currentLang)}: ${new Date().toLocaleString()}`,
      `        ${t('export_pdf_doc_total', currentLang)}: ${messages.length}`,
      `        ${t('export_pdf_doc_target_lang', currentLang)}: ${currentLang.toUpperCase()}`,
      '==================================================\n',
    ];

    messages.forEach((msg, idx) => {
      const timeStr = formatDate(msg.timestamp);
      const translated = msg.translations[currentLang] || msg.originalText;
      const isMe = msg.senderId === currentUserId;
      const speakerTag = isMe ? `${msg.senderName} ${t('export_pdf_doc_me', currentLang)}` : msg.senderName;
      lines.push(`[${idx + 1}] (${timeStr}) ${speakerTag} [${msg.detectedLang.toUpperCase()}]:`);
      lines.push(`     ${t('export_pdf_doc_orig', currentLang)}: "${msg.originalText}"`);
      if (translated !== msg.originalText) {
        lines.push(`  -> ${t('export_pdf_doc_trans', currentLang)} (${currentLang.toUpperCase()}): "${translated}"`);
      }
      lines.push('');
    });

    lines.push('==================================================');
    lines.push(t('export_pdf_doc_footer', currentLang));
    return lines.join('\n');
  };

  // 1. DIRECT PDF DOWNLOAD (Chat bubble UI identical to screen)
  const handleDownloadPdf = async () => {
    if (messages.length === 0 || isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    try {
      // Ensure hidden container is rendered
      await new Promise((resolve) => setTimeout(resolve, 100));

      const element = pdfTemplateRef.current;
      if (!element) {
        throw new Error('Template element not ready');
      }

      // Capture at high resolution (scale 2) for ultra-crisp Vietnamese accents & Chinese CJK glyphs
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#0b1120',
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Slice subsequent pages if content exceeds A4 length
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      pdf.save(`HoiThoai_${roomId}_${dateStr}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Không thể tạo file PDF. Vui lòng tải file TXT để thay thế.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 2. DOWNLOAD TXT
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

  // 3. COPY ALL TO CLIPBOARD
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

  // 4. HTML REPORT
  const handleDownloadHtmlReport = () => {
    const rowsHtml = messages
      .map((msg, idx) => {
        const timeStr = formatDate(msg.timestamp);
        const translated = msg.translations[currentLang] || msg.originalText;
        const isMe = msg.senderId === currentUserId;
        const meLabel = isMe ? ` <span style="color: #2563eb; font-weight: normal;">${t('export_pdf_doc_me', currentLang)}</span>` : '';
        return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; font-size: 12px; color: #64748b; white-space: nowrap;">#${idx + 1} (${timeStr})</td>
          <td style="padding: 10px; font-weight: bold; color: #1e293b; white-space: nowrap;">${msg.senderName}${meLabel}</td>
          <td style="padding: 10px; color: #334155; font-size: 14px;">
            <div style="font-weight: 500;">${msg.originalText}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${t('export_pdf_doc_orig', currentLang)}: ${msg.detectedLang.toUpperCase()}</div>
          </td>
          <td style="padding: 10px; color: #0f172a; font-size: 14px; font-weight: 600; background: #f8fafc;">
            ${translated}
          </td>
        </tr>`;
      })
      .join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="${currentLang}">
<head>
  <meta charset="UTF-8">
  <title>${t('export_pdf_doc_title', currentLang)} - ${roomId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif; padding: 30px; max-width: 900px; margin: 0 auto; color: #0f172a; line-height: 1.5; }
    .header { border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 22px; font-weight: bold; color: #1e3a8a; margin: 0 0 5px 0; }
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
      <h1 class="title">${t('export_pdf_doc_title', currentLang)}</h1>
      <div class="meta">${t('export_pdf_doc_room', currentLang)}: <strong>${roomId}</strong> • ${t('export_pdf_doc_time', currentLang)}: ${new Date().toLocaleString()} • ${t('export_pdf_doc_total', currentLang)}: ${messages.length}</div>
    </div>
    <div class="no-print">
      <button class="btn-print" onclick="window.print()">🖨️ In / Print</button>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 15%;">${t('export_pdf_doc_time', currentLang)}</th>
        <th style="width: 20%;">${t('export_pdf_doc_room', currentLang)}</th>
        <th style="width: 35%;">${t('export_pdf_doc_orig', currentLang)}</th>
        <th style="width: 30%;">${t('export_pdf_doc_trans', currentLang)} (${currentLang.toUpperCase()})</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
  <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px;">
    ${t('export_pdf_doc_footer', currentLang)}
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
    <>
      {/* ========================================================================= */}
      {/* HIDDEN OFFSCREEN TEMPLATE: Renders chat bubbles identically for PDF export */}
      {/* ========================================================================= */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: '-9999px',
          width: '794px', // Standard A4 pixel width at 96 DPI
          minHeight: '1123px',
          backgroundColor: '#0b1120',
          color: '#f8fafc',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
          padding: '32px 28px',
          boxSizing: 'border-box',
          zIndex: -1,
        }}
        ref={pdfTemplateRef}
      >
        {/* Document Header Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            border: '1.5px solid #3b82f6',
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '28px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #2563eb, #06b6d4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  fontSize: '16px',
                }}
              >
                E
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.5px', color: '#ffffff' }}>
                  ExpoTrans
                </div>
                <div style={{ fontSize: '10px', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Realtime Translation System
                </div>
              </div>
            </div>
            <div
              style={{
                fontSize: '11px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#93c5fd',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontWeight: '600',
              }}
            >
              {t('export_pdf_doc_target_lang', currentLang)}: {currentLang.toUpperCase()}
            </div>
          </div>

          <div
            style={{
              fontSize: '17px',
              fontWeight: '700',
              color: '#f8fafc',
              marginBottom: '14px',
              letterSpacing: '0.3px',
            }}
          >
            {t('export_pdf_doc_title', currentLang)}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12px', color: '#94a3b8' }}>
            <div>
              <span style={{ color: '#cbd5e1' }}>{t('export_pdf_doc_room', currentLang)}:</span>{' '}
              <strong style={{ color: '#60a5fa' }}>{roomId}</strong>
            </div>
            <div>•</div>
            <div>
              <span style={{ color: '#cbd5e1' }}>{t('export_pdf_doc_time', currentLang)}:</span>{' '}
              {new Date().toLocaleString()}
            </div>
            <div>•</div>
            <div>
              <span style={{ color: '#cbd5e1' }}>{t('export_pdf_doc_total', currentLang)}:</span>{' '}
              <strong style={{ color: '#ffffff' }}>{messages.length}</strong>
            </div>
          </div>
        </div>

        {/* Message Feed Layout: identical to messenger chat feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            const translatedText = msg.translations[currentLang] || msg.originalText;
            const firstChar = (msg.senderName || 'U').charAt(0).toUpperCase();
            const timeStr = formatDate(msg.timestamp);

            return (
              <div
                key={`pdf-${msg.id}`}
                style={{
                  display: 'flex',
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-end',
                  gap: '10px',
                  width: '100%',
                }}
              >
                {/* Partner Avatar (Left side) */}
                {!isMe && (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: getAvatarGradient(msg.senderName),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      flexShrink: 0,
                      marginBottom: '4px',
                    }}
                  >
                    {firstChar}
                  </div>
                )}

                {/* Bubble Container */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '82%',
                  }}
                >
                  {/* Sender Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '4px',
                      padding: '0 4px',
                      fontSize: '11px',
                      color: '#94a3b8',
                    }}
                  >
                    <span style={{ fontWeight: '600', color: isMe ? '#93c5fd' : '#e2e8f0' }}>
                      {msg.senderName} {isMe ? t('export_pdf_doc_me', currentLang) : ''}
                    </span>
                    <span>•</span>
                    <span
                      style={{
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        padding: '1px 5px',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        color: '#cbd5e1',
                      }}
                    >
                      {msg.detectedLang}
                    </span>
                  </div>

                  {/* Messenger Bubble */}
                  <div
                    style={{
                      background: isMe
                        ? 'linear-gradient(135deg, #2563eb, #4338ca)'
                        : '#1e293b',
                      color: isMe ? '#ffffff' : '#f1f5f9',
                      border: isMe
                        ? '1px solid #60a5fa'
                        : '1px solid #334155',
                      borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      padding: '12px 16px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                    }}
                  >
                    {/* Primary Translation */}
                    <div
                      style={{
                        fontSize: '15px',
                        lineHeight: '1.45',
                        fontWeight: '500',
                        color: isMe ? '#ffffff' : '#f8fafc',
                      }}
                    >
                      {translatedText}
                    </div>

                    {/* Original Subtext */}
                    {msg.originalText && msg.originalText !== translatedText && (
                      <div
                        style={{
                          marginTop: '8px',
                          paddingTop: '6px',
                          borderTop: isMe
                            ? '1px solid rgba(255, 255, 255, 0.25)'
                            : '1px solid #334155',
                          fontSize: '12px',
                          fontStyle: 'italic',
                          color: isMe ? '#e0e7ff' : '#94a3b8',
                        }}
                      >
                        <span
                          style={{
                            fontStyle: 'normal',
                            fontWeight: '600',
                            marginRight: '4px',
                            opacity: 0.8,
                          }}
                        >
                          [{t('export_pdf_doc_orig', currentLang)}]:
                        </span>
                        "{msg.originalText}"
                      </div>
                    )}

                    {/* Bubble Footer Tag */}
                    <div
                      style={{
                        marginTop: '8px',
                        paddingTop: '6px',
                        borderTop: isMe
                          ? '1px solid rgba(255, 255, 255, 0.15)'
                          : '1px solid rgba(51, 65, 85, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '10px',
                        color: isMe ? '#bfdbfe' : '#64748b',
                      }}
                    >
                      <span>
                        {msg.detectedLang.toUpperCase()} → {currentLang.toUpperCase()}
                      </span>
                      <span style={{ marginLeft: '12px' }}>{timeStr}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Document Footer */}
        <div
          style={{
            marginTop: '36px',
            paddingTop: '16px',
            borderTop: '1px solid #1e293b',
            textAlign: 'center',
            fontSize: '11px',
            color: '#64748b',
          }}
        >
          {t('export_pdf_doc_footer', currentLang)}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DIALOG UI                                                           */}
      {/* ========================================================================= */}
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
              disabled={isGeneratingPdf}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
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
              {/* Option 1: Direct PDF Download (Visual chat layout, 1-click download) */}
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="w-full p-4 bg-gradient-to-r from-blue-600/25 via-indigo-600/25 to-cyan-600/25 hover:from-blue-600/35 hover:via-indigo-600/35 hover:to-cyan-600/35 border-2 border-blue-500/50 rounded-2xl flex items-center justify-between transition group text-left shadow-lg shadow-blue-500/10 disabled:opacity-60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl shadow-md shrink-0">
                    {isGeneratingPdf ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <FileDown className="w-5 h-5" />
                    )}
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-sm text-white flex items-center gap-1.5">
                      <span>{t('export_pdf_btn', currentLang)}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full font-bold shadow-sm flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        {t('export_pdf_recommended', currentLang)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 truncate mt-0.5">
                      {isGeneratingPdf
                        ? t('export_pdf_generating', currentLang)
                        : t('export_pdf_desc', currentLang)}
                    </div>
                  </div>
                </div>
                {isGeneratingPdf ? (
                  <Loader2 className="w-4 h-4 text-blue-400 shrink-0 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-blue-400 shrink-0 group-hover:translate-y-0.5 transition" />
                )}
              </button>

              {/* Option 2: Download TXT */}
              <button
                onClick={handleDownloadTxt}
                disabled={isGeneratingPdf}
                className="w-full p-3.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl flex items-center justify-between transition group text-left disabled:opacity-50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-slate-700 text-slate-200 rounded-xl shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-sm text-white">
                      {t('export_txt_btn', currentLang)}
                    </div>
                    <div className="text-xs text-slate-400 truncate mt-0.5">
                      {t('export_txt_desc', currentLang)}
                    </div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-y-0.5 transition" />
              </button>

              {/* Option 3: Copy to Clipboard */}
              <button
                onClick={handleCopyAll}
                disabled={isGeneratingPdf}
                className="w-full p-3.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl flex items-center justify-between transition text-left disabled:opacity-50"
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
                      {t('export_copied', currentLang) ? t('export_copied', currentLang) : 'Zalo, WeChat, Ghi chú'}
                    </div>
                  </div>
                </div>
                {copied ? (
                  <span className="text-xs font-semibold text-emerald-400 shrink-0">✓ OK</span>
                ) : (
                  <Copy className="w-4 h-4 text-slate-400 shrink-0" />
                )}
              </button>

              {/* Option 4: Open HTML Report */}
              <button
                onClick={handleDownloadHtmlReport}
                disabled={isGeneratingPdf}
                className="w-full p-3.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl flex items-center justify-between transition text-left disabled:opacity-50"
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
              disabled={isGeneratingPdf}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-2xl transition text-xs disabled:opacity-50"
            >
              {t('export_close', currentLang)}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
