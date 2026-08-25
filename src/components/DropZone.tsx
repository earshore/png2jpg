import React, { useRef, useState } from 'react';
import { Upload, FolderPlus, Sparkles, Image as ImageIcon, FileCheck, Layers, Clipboard } from 'lucide-react';

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
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
            ? 'border-amber-500 bg-amber-500/10 text-amber-300 scale-[1.005]'
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
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
          <Upload className="w-4 h-4" />
        </div>
        <div className="text-xs sm:text-sm">
          <span className="font-semibold text-slate-200">点击或拖拽更多 PNG 图片至此添加</span>
          <span className="text-slate-400 ml-2 hidden sm:inline">
            (支持批量选择、拖入或 <kbd className="px-1.5 py-0.5 bg-slate-800 text-amber-300 font-mono rounded text-[11px] border border-slate-700">Ctrl+V</kbd> 截图粘贴)
          </span>
        </div>
      </div>
    );
  }

  // Hero mode when empty
  return (
    <div
      id="hero-dropzone"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all flex flex-col items-center justify-center gap-6 max-w-3xl mx-auto shadow-2xl ${
        isDragOver
          ? 'border-amber-500 bg-amber-500/10 scale-[1.01] shadow-amber-500/20'
          : 'border-slate-800 bg-slate-900/80 hover:border-slate-700 shadow-slate-950/50'
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

      {/* Hero Icon */}
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-amber-500/10 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
        <Upload className="w-9 h-9 stroke-[2.2]" />
      </div>

      {/* Main Title & Instructions */}
      <div className="flex flex-col gap-2 max-w-md">
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          拖拽 PNG 图片至此处，或一键导入
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          纯浏览器端毫秒级转换 · 100% 像素级无损画质 · 智能背景色填充 · 批量自增编号与时间戳导出
        </p>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
        >
          <ImageIcon className="w-4 h-4 fill-slate-950" />
          <span>选择 PNG 文件 (Ctrl+O)</span>
        </button>

        <button
          onClick={() => folderInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition active:scale-95 cursor-pointer"
          title="导入整个文件夹中的所有 PNG 图片"
        >
          <FolderPlus className="w-4 h-4 text-amber-400" />
          <span>导入整个文件夹</span>
        </button>
      </div>

      {/* Hotkey and Paste Reminder */}
      <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/60 px-3.5 py-1.5 rounded-xl border border-slate-800">
        <Clipboard className="w-3.5 h-3.5 text-amber-400" />
        <span>支持从剪贴板直接粘贴截图：按 <kbd className="px-1.5 py-0.5 bg-slate-800 text-amber-300 font-mono rounded text-[11px] border border-slate-700">Ctrl + V</kbd> 即可导入</span>
      </div>

      {/* Demo sample generator */}
      {onGenerateSampleImages && (
        <div className="pt-2 border-t border-slate-800/80 w-full flex flex-col items-center gap-2">
          <span className="text-xs text-slate-400">没有现成 PNG？可一键生成测试图片体验转换：</span>
          <button
            onClick={onGenerateSampleImages}
            className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg border border-amber-500/20 transition cursor-pointer font-medium"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>生成 4 张高清测试 PNG (含透明通道与渐变)</span>
          </button>
        </div>
      )}
    </div>
  );
};
