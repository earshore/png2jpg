import React from 'react';
import { Layers, Image as ImageIcon, Sparkles, FolderDown, Trash2, Play, RefreshCw, CheckCircle2 } from 'lucide-react';
import { ImageItem } from '../types';
import { formatBytes } from '../utils/imageConverter';

interface WorkbenchHeaderProps {
  items: ImageItem[];
  isProcessing: boolean;
  onStartAll: () => void;
  onSaveAll: () => void;
  onClearAll: () => void;
  onReconvertAll: () => void;
  onOpenFileInput: () => void;
}

export const WorkbenchHeader: React.FC<WorkbenchHeaderProps> = ({
  items,
  isProcessing,
  onStartAll,
  onSaveAll,
  onClearAll,
  onReconvertAll,
  onOpenFileInput,
}) => {
  const totalCount = items.length;
  const doneCount = items.filter((i) => i.status === 'done').length;
  const pendingCount = items.filter((i) => i.status === 'idle' || i.status === 'error').length;
  const totalOriginalSize = items.reduce((acc, cur) => acc + cur.originalSize, 0);

  return (
    <header
      id="workbench-header"
      className="bg-slate-900/90 backdrop-blur-md text-slate-100 border-b border-slate-800/80 sticky top-0 z-40 shadow-md transition-all"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand / Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-orange-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black">
            <Layers className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                PNG 转 JPG 高保真工作台
              </h1>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full">
                <Sparkles className="w-3 h-3 text-amber-400" />
                100% 像素级保真
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden lg:block">
              纯本地渲染 · 保留 1:1 分辨率与 sRGB 原彩 · 智能平底填色 · 毫秒级多线程导出
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {totalCount > 0 && (
            <>
              {/* Convert Pending */}
              {pendingCount > 0 && (
                <button
                  id="btn-start-convert-all"
                  onClick={onStartAll}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                  title="开始批量转换未完成的图片 (Ctrl+Enter)"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>转换未完成 ({pendingCount})</span>
                </button>
              )}

              {/* Reconvert All (when all are done) */}
              {pendingCount === 0 && doneCount > 0 && (
                <button
                  id="btn-reconvert-all"
                  onClick={onReconvertAll}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/80 transition cursor-pointer"
                  title="使用当前画质与命名规则全部重新转换"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">重新转换全部</span>
                </button>
              )}

              {/* Export All Done */}
              {doneCount > 0 && (
                <button
                  id="btn-export-all"
                  onClick={onSaveAll}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 transition disabled:opacity-50 shadow-md cursor-pointer"
                  title="导出全部已就绪的 JPG 文件 (Ctrl+S)"
                >
                  <FolderDown className="w-4 h-4" />
                  <span>导出已就绪 ({doneCount})</span>
                </button>
              )}

              {/* Clear List */}
              <button
                id="btn-clear-all"
                onClick={onClearAll}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-800/80 text-slate-400 hover:bg-red-500/15 hover:text-red-300 hover:border-red-500/30 border border-slate-700/80 transition cursor-pointer"
                title="清空当前所有图片 (Ctrl+Delete)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">清空</span>
              </button>
            </>
          )}

          {/* Import Button */}
          <button
            id="btn-add-more-files"
            onClick={onOpenFileInput}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition active:scale-95 cursor-pointer shadow-sm"
            title="导入本地 PNG 图片文件 (Ctrl+O)"
          >
            <ImageIcon className="w-4 h-4 text-amber-400" />
            <span>导入 PNG</span>
          </button>
        </div>
      </div>
    </header>
  );
};
