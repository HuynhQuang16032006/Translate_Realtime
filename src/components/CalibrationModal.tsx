import React, { useState } from 'react';
import { Sliders, X, Sparkles, Check, Volume2 } from 'lucide-react';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThreshold: number;
  onSaveThreshold: (db: number) => void;
  onRunAutoCalibrate: () => Promise<number>;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  currentThreshold,
  onSaveThreshold,
  onRunAutoCalibrate,
}) => {
  const [sliderVal, setSliderVal] = useState(currentThreshold);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibratedVal, setCalibratedVal] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleAuto = async () => {
    setIsCalibrating(true);
    setCalibratedVal(null);
    try {
      const result = await onRunAutoCalibrate();
      setSliderVal(result);
      setCalibratedVal(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCalibrating(false);
    }
  };

  const handleSave = () => {
    onSaveThreshold(sliderVal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-left">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2 text-blue-400">
          <Sliders className="w-5 h-5" />
          <h2 className="text-base font-semibold text-white">Cân Chỉnh Lọc Ồn Triển Lãm</h2>
        </div>

        <p className="text-xs text-slate-400 mb-5 leading-relaxed">
          Đo độ ồn xung quanh gian hàng máy móc để hệ thống chỉ kích hoạt thu âm khi đưa máy sát miệng.
        </p>

        {/* Auto Calibration Button */}
        <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-xl mb-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-200">Cân chỉnh tự động (3 giây)</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-[11px] text-slate-400">
            Giữ yên lặng xung quanh trong 3 giây để máy tự động đo cường độ âm thanh nền.
          </p>
          <button
            onClick={handleAuto}
            disabled={isCalibrating}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
              isCalibrating
                ? 'bg-amber-600 text-white animate-pulse'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {isCalibrating ? (
              <span>Đang đo tiếng ồn gian hàng...</span>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>Bắt đầu đo tiếng ồn nền</span>
              </>
            )}
          </button>
          {calibratedVal !== null && (
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium pt-1">
              <Check className="w-3.5 h-3.5" />
              <span>Đã cân chỉnh thành công mức tối ưu: {calibratedVal} dB</span>
            </div>
          )}
        </div>

        {/* Manual Slider */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-medium">Ngưỡng Proximity dB thủ công:</span>
            <span className="font-mono text-blue-400 font-bold">{sliderVal} dB</span>
          </div>
          <input
            type="range"
            min="-65"
            max="-20"
            step="1"
            value={sliderVal}
            onChange={(e) => setSliderVal(parseInt(e.target.value, 10))}
            className="w-full accent-blue-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>-65 dB (Nhạy hơn)</span>
            <span>-20 dB (Chống ồn cực mạnh)</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
          >
            Đóng
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-blue-500/20"
          >
            Lưu cài đặt
          </button>
        </div>
      </div>
    </div>
  );
};
