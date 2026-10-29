import React from 'react';
import { Unlock, Mic, Volume2 } from 'lucide-react';
import type { RoomLockState } from '../types';

interface LiveStatusBarProps {
  lockState: RoomLockState;
  currentUserId: string;
  isRecording: boolean;
  isProcessing: boolean;
  audioLevelNormalized: number;
  thresholdNormalized: number;
  onEmergencyUnlock: () => void;
}

export const LiveStatusBar: React.FC<LiveStatusBarProps> = ({
  lockState,
  currentUserId,
  isRecording,
  isProcessing,
  audioLevelNormalized,
  thresholdNormalized,
  onEmergencyUnlock,
}) => {
  const isHeldByMe = lockState.isLocked && lockState.lockedBy === currentUserId;
  const isHeldByOther = lockState.isLocked && lockState.lockedBy !== currentUserId;

  return (
    <div className="bg-slate-900/95 border-b border-slate-800/80 px-4 py-2 text-xs">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Left: Speaker Status Indicator */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isProcessing ? (
            <div className="flex items-center gap-1.5 text-blue-400 font-medium animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
              <span>Gemini AI đang nhận diện & phiên dịch chuyên ngành...</span>
            </div>
          ) : isHeldByOther ? (
            <div className="flex items-center justify-between w-full sm:w-auto gap-3 text-rose-400 font-medium bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                <span>
                  <strong>{lockState.speakerName || 'Đối tác'}</strong> đang nói... (Máy bạn tạm ngưng)
                </span>
              </div>
              <button
                onClick={onEmergencyUnlock}
                title="Bấm để giải phóng phòng nếu máy đối tác bị mất mạng treo khóa"
                className="text-[10px] bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 px-2 py-0.5 rounded transition flex items-center gap-1 shrink-0"
              >
                <Unlock className="w-3 h-3" />
                <span>Mở khóa</span>
              </button>
            </div>
          ) : isHeldByMe || isRecording ? (
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <Mic className="w-3.5 h-3.5" />
              <span>Bạn đang nói (Đã khóa mic các máy khác)...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400">
              <Volume2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Phòng chờ sẵn sàng • Đưa máy lại gần miệng để nói</span>
            </div>
          )}
        </div>

        {/* Right: Live Audio Level & Threshold Visualizer */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-[10px] text-slate-400 font-mono shrink-0">Cường độ Mic:</span>
          <div className="relative w-28 sm:w-36 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            {/* Audio level fill */}
            <div
              className={`h-full transition-all duration-75 ${
                audioLevelNormalized >= thresholdNormalized
                  ? 'bg-emerald-500 shadow-sm shadow-emerald-400'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${audioLevelNormalized}%` }}
            />
            {/* Threshold trigger mark */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10"
              style={{ left: `${thresholdNormalized}%` }}
              title="Ngưỡng kích hoạt âm thanh (Proximity Gate)"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
