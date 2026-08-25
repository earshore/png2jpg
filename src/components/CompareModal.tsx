import React, { useState } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  Download,
  ShieldCheck,
  SlidersHorizontal,
  Columns2,
  Layers,
  Sparkles,
  Maximize2,
  CheckCircle2,
} from 'lucide-react';
import { ImageItem, ConversionConfig } from '../types';
import { formatBytes, getOutputFilename } from '../utils/imageConverter';

interface CompareModalProps {
  item: ImageItem | null;
  itemIndex?: number;
  config: ConversionConfig;
  onClose: () => void;
  onDownload: (item: ImageItem) => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  item,
  itemIndex = 1,
  config,
  onClose,
  onDownload,
}) => {
  const [sliderPos, setSliderPos] = useState(50); // 0 to 100%
  const [viewMode, setViewMode] = useState<'split' | 'side-by-side' | 'toggle'>('split');
  const [activeToggleLayer, setActiveToggleLayer] = useState<'original' | 'converted'>('converted');
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1, 1.5, 2
  const [bgStyle, setBgStyle] = useState<'grid' | 'black' | 'white'>('grid');

  if (!item) return null;

  const outputName = getOutputFilename(item.name, config, itemIndex);
  const isDone = item.status === 'done' && item.convertedUrl;

  const bgClasses = {
    grid: 'bg-[radial-gradient(#334155_1.5px,transparent_1.5px)] [background-size:16px_16px] bg-slate-950',
    black: 'bg-black',
    white: 'bg-white',
  };

  return (
    <div
      id="compare-modal-overlay"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="compare-modal-content"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                画质与色彩保真度对比
              </h3>
              <p className="text-xs text-slate-400 font-mono truncate max-w-xs sm:max-w-md">
                {item.name} ➔ <span className="text-amber-300 font-semibold">{outputName}</span>
              </p>
            </div>
          </div>

          {/* Right Toolbar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700 text-xs">
              <button
                onClick={() => setViewMode('split')}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  viewMode === 'split' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="左右拉动滑块对比"
              >
                滑动对比
              </button>
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  viewMode === 'side-by-side' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="左右双屏并排对比"
              >
                并排
              </button>
              <button
                onClick={() => setViewMode('toggle')}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  viewMode === 'toggle' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="单图点击快速切换"
              >
                点击切换
              </button>
            </div>

            {/* Zoom Toggle */}
            <div className="hidden sm:flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700 text-xs font-mono">
              {[1, 1.5, 2].map((z) => (
                <button
                  key={z}
                  onClick={() => setZoomLevel(z)}
                  className={`px-2 py-1 rounded cursor-pointer transition ${
                    zoomLevel === z ? 'bg-slate-700 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {z === 1 ? '适应' : `${z}x`}
                </button>
              ))}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comparison Viewer Canvas */}
        <div className={`flex-1 relative overflow-auto flex items-center justify-center min-h-[360px] sm:min-h-[460px] p-4 ${bgClasses[bgStyle]}`}>
          {/* Mode 1: Split Slider */}
          {viewMode === 'split' && (
            <div
              className="relative max-w-full max-h-[60vh] select-none rounded-xl overflow-hidden border border-slate-800 shadow-2xl"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center', transition: 'transform 0.2s' }}
            >
              {/* Converted JPG (Background / Right Side) */}
              <img
                src={item.convertedUrl || item.originalUrl}
                alt="JPG Converted"
                className="max-h-[55vh] max-w-full object-contain block pointer-events-none"
                referrerPolicy="no-referrer"
              />

              {/* Original PNG (Foreground / Left Side with clip-path) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
              >
                <img
                  src={item.originalUrl}
                  alt="Original PNG"
                  className="max-h-[55vh] max-w-full object-contain block pointer-events-none"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Slider Line & Handle */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)] cursor-ew-resize z-20 flex items-center justify-center pointer-events-none"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="w-7 h-7 -ml-[13px] rounded-full bg-amber-500 text-slate-950 shadow-xl flex items-center justify-center font-black text-xs border-2 border-white pointer-events-auto cursor-ew-resize">
                  ⬌
                </div>
              </div>

              {/* Overlay Badges */}
              <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-200 border border-slate-700 pointer-events-none z-10">
                原图 PNG (原色彩/透明通道)
              </div>
              <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-300 border border-amber-500/30 pointer-events-none z-10">
                输出 JPG ({Math.round(config.quality * 100)}% 画质)
              </div>

              {/* Range input */}
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="absolute inset-0 opacity-0 cursor-ew-resize z-30 w-full h-full"
              />
            </div>
          )}

          {/* Mode 2: Side by Side */}
          {viewMode === 'side-by-side' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full h-full max-h-[60vh]">
              {/* Left: Original PNG */}
              <div className="flex flex-col items-center justify-center bg-slate-900/60 rounded-xl p-3 border border-slate-800 relative overflow-hidden">
                <span className="absolute top-3 left-3 bg-slate-950/90 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-300 border border-slate-700 z-10">
                  原图 PNG ({item.originalWidth}×{item.originalHeight})
                </span>
                <img
                  src={item.originalUrl}
                  alt="Original PNG"
                  className="max-h-[48vh] max-w-full object-contain rounded"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Right: Converted JPG */}
              <div className="flex flex-col items-center justify-center bg-slate-900/60 rounded-xl p-3 border border-slate-800 relative overflow-hidden">
                <span className="absolute top-3 left-3 bg-amber-500/20 px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-300 border border-amber-500/30 z-10">
                  输出 JPG ({Math.round(config.quality * 100)}% 画质)
                </span>
                <img
                  src={item.convertedUrl || item.originalUrl}
                  alt="Converted JPG"
                  className="max-h-[48vh] max-w-full object-contain rounded"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          )}

          {/* Mode 3: Toggle / Blink */}
          {viewMode === 'toggle' && (
            <div
              className="flex flex-col items-center justify-center cursor-pointer select-none max-h-[60vh]"
              onClick={() => setActiveToggleLayer(activeToggleLayer === 'original' ? 'converted' : 'original')}
            >
              <div className="relative rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
                <img
                  src={activeToggleLayer === 'original' ? item.originalUrl : item.convertedUrl || item.originalUrl}
                  alt="Comparison target"
                  className="max-h-[52vh] max-w-full object-contain block"
                  style={{ transform: `scale(${zoomLevel})` }}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 left-3 bg-slate-950/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700 flex items-center gap-2">
                  <span className={activeToggleLayer === 'original' ? 'text-slate-200' : 'text-amber-300'}>
                    当前正在查看: {activeToggleLayer === 'original' ? '原图 PNG' : '转换后 JPG'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal bg-slate-800 px-1.5 py-0.5 rounded">
                    (点击图片快速切换对比)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Meta & Actions */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-slate-300">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>1:1 分辨率:</span>
              <span className="font-mono font-bold text-white">
                {item.originalWidth} × {item.originalHeight} px
              </span>
            </div>
            <div className="h-3.5 w-px bg-slate-800 hidden sm:block" />
            <div>
              <span>原图大小:</span>{' '}
              <span className="font-mono font-bold text-slate-200">
                {formatBytes(item.originalSize)}
              </span>
            </div>
            {isDone && (
              <>
                <div className="h-3.5 w-px bg-slate-800 hidden sm:block" />
                <div>
                  <span>JPG 输出大小:</span>{' '}
                  <span className="font-mono font-bold text-amber-300">
                    {formatBytes(item.convertedSize || 0)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {isDone && (
              <button
                onClick={() => onDownload(item)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition cursor-pointer shadow-sm active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>立即下载此 JPG</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
