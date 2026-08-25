import React, { useRef, useState } from 'react';
import {
  Upload,
  FolderPlus,
  Sparkles,
  Image as ImageIcon,
  ShieldCheck,
  Zap,
  Layers,
  Clipboard,
  CheckCircle2,
  SlidersHorizontal,
  FolderDown,
  ArrowRight,
} from 'lucide-react';

interface DropZoneProps {
  isCompact?: boolean;
  onFilesSelected: (files: File[]) => void;
  onGenerateSampleImages?: () => void;
}

export const DropZone: React.FC<DropZoneProps> = ({
  isCompact = false,
  onFilesSelected,
  onGenerateSampleImages,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const rawFiles = Array.from(e.dataTransfer.files) as File[];
      const pngFiles = rawFiles.filter(
        (f) => f.type === 'image/png' || f.name.toLowerCase().endsWith('.png')
      );
      if (pngFiles.length > 0) {
        onFilesSelected(pngFiles);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const rawFiles = Array.from(e.target.files) as File[];
      const pngFiles = rawFiles.filter(
        (f) => f.type === 'image/png' || f.name.toLowerCase().endsWith('.png')
      );
      if (pngFiles.length > 0) {
        onFilesSelected(pngFiles);
      }
      e.target.value = '';
    }
  };

  // Compact mode under existing table
  if (isCompact) {
    return (
      <div
        id="compact-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center transition-all cursor-pointer flex flex-wrap items-center justify-center gap-3 select-none ${
          isDragOver
            ? 'border-amber-500 bg-amber-500/15 text-amber-300 scale-[1.005] shadow-lg shadow-amber-500/10'
            : 'border-slate-800 hover:border-amber-500/50 bg-slate-900/50 hover:bg-slate-900/80 text-slate-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,image/png"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 animate-pulse">
          <Upload className="w-4 h-4" />
        </div>
        <div className="text-xs sm:text-sm">
          <span className="font-semibold text-slate-200">点击或拖拽更多 PNG 图片至此添加</span>
          <span className="text-slate-400 ml-2 hidden sm:inline">
            (支持批量选择、多图拖入或{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-800 text-amber-300 font-mono rounded text-[11px] border border-slate-700">
              Ctrl+V
            </kbd>{' '}
            截图粘贴)
          </span>
        </div>
      </div>
    );
  }

  // Hero mode when empty: Enhanced with Breathing Light Effect and Clear Visual Onboarding Guide
  return (
    <div className="relative max-w-4xl mx-auto w-full">
      {/* Ambient Breathing Glow Behind the Main Dropzone Card */}
      <div className="absolute -inset-1.5 rounded-[32px] bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-amber-500/25 blur-xl opacity-75 animate-pulse -z-10 pointer-events-none" />

      <div
        id="hero-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl p-7 sm:p-11 text-center transition-all duration-300 flex flex-col items-center justify-center gap-6 shadow-2xl overflow-hidden backdrop-blur-sm ${
          isDragOver
            ? 'border-amber-400 bg-amber-500/15 scale-[1.015] shadow-amber-500/25'
            : 'border-amber-500/40 hover:border-amber-400/70 bg-slate-900/90 shadow-slate-950/80'
        }`}
      >
        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,image/png"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory="true"
          directory="true"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* Top Status Breathing Light Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-950/80 border border-amber-500/30 text-xs font-semibold shadow-inner">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-slate-300">纯前端离线运行环境就绪</span>
          <span className="text-slate-500">|</span>
          <span className="text-amber-400 font-mono">等待导入 PNG 图片</span>
        </div>

        {/* Hero Central Icon with Pulsing Breathing Ring */}
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="absolute -inset-2 rounded-3xl bg-amber-500/20 blur-md group-hover:bg-amber-500/30 transition duration-300 animate-pulse" />
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-amber-500/25 via-amber-500/15 to-orange-500/20 border-2 border-amber-500/40 group-hover:border-amber-400 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/20 transition-all duration-300 group-hover:scale-105">
            <Upload className="w-10 h-10 sm:w-11 sm:h-11 stroke-[2.2] animate-bounce duration-1000" />
          </div>
        </div>

        {/* Main Title & Description */}
        <div className="flex flex-col gap-2.5 max-w-lg">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {isDragOver ? '松开鼠标立即导入 PNG 图片' : '拖拽 PNG 图片至此处，或一键导入'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            默认 100% 像素级无损转换 · 智能透明通道底色填充 · 批量序号与动态命名 · 单张/ZIP/本地目录快速导出
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <button
            id="btn-hero-select-files"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-sm transition shadow-lg shadow-amber-500/25 active:scale-95 cursor-pointer hover:shadow-amber-500/40"
          >
            <ImageIcon className="w-4 h-4 fill-slate-950" />
            <span>选择 PNG 文件 (Ctrl+O)</span>
          </button>

          <button
            id="btn-hero-select-folder"
            onClick={() => folderInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700/80 hover:border-slate-600 transition active:scale-95 cursor-pointer shadow-md"
            title="导入整个文件夹中的所有 PNG 图片"
          >
            <FolderPlus className="w-4 h-4 text-amber-400" />
            <span>导入文件夹</span>
          </button>
        </div>

        {/* Hotkey and Paste Reminder */}
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/70 px-4 py-2 rounded-xl border border-slate-800/90 shadow-sm">
          <Clipboard className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            支持从剪贴板直接粘贴：按{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-800 text-amber-300 font-mono rounded text-[11px] border border-slate-700 font-bold">
              Ctrl + V
            </kbd>{' '}
            或 <kbd className="px-1.5 py-0.5 bg-slate-800 text-amber-300 font-mono rounded text-[11px] border border-slate-700 font-bold">⌘ + V</kbd> 即可秒级导入
          </span>
        </div>

        {/* Visual 3-Step Guide Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl pt-2 text-left">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 border border-amber-500/20">
              1
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">批量导入图片</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                支持多选文件、拖拽文件夹或剪贴板截图粘贴
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 border border-amber-500/20">
              2
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">调控画质与重命名</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                自定义背景填色、画质压缩比及序号排序规则
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/20">
              3
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">高速批量导出</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                秒级并发转码，支持 ZIP 打包或单机目录落盘
              </div>
            </div>
          </div>
        </div>

        {/* Feature Security Badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400 pt-1">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            100% 浏览器本地离线处理，无数据泄露风险
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            支持多线程并发高效转码
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            保留全色彩深度与 ICC 色域
          </span>
        </div>

        {/* Demo sample generator */}
        {onGenerateSampleImages && (
          <div className="pt-3 border-t border-slate-800/80 w-full flex flex-col items-center gap-2">
            <span className="text-xs text-slate-400">没有现成 PNG？可一键生成测试图片快速体验：</span>
            <button
              id="btn-generate-samples"
              onClick={onGenerateSampleImages}
              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3.5 py-1.5 rounded-xl border border-amber-500/30 transition cursor-pointer font-semibold shadow-sm hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>生成 4 张高清测试 PNG (包含透明渐变与几何图层)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
