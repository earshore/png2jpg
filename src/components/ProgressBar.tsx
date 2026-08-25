import React from 'react';
import { Loader2, CheckCircle2, FolderDown, Play, Sparkles, CheckCheck } from 'lucide-react';
import { ImageItem, DirectoryConfig } from '../types';
import { formatBytes } from '../utils/imageConverter';

interface ProgressBarProps {
  items: ImageItem[];
  isProcessing: boolean;
  dirConfig: DirectoryConfig;
  onStartConvertAll: () => void;
  onExportAll: () => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  items,
  isProcessing,
  dirConfig,
  onStartConvertAll,
  onExportAll,
}) => {
  if (items.length === 0) return null;

  const total = items.length;
  const doneCount = items.filter((i) => i.status === 'done').length;
  const processingCount = items.filter((i) => i.status === 'processing').length;
  const pendingCount = items.filter((i) => i.status === 'idle' || i.status === 'error').length;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const totalOriginalSize = items.reduce((acc, cur) => acc + cur.originalSize, 0);
  const totalConvertedSize = items
    .filter((i) => i.status === 'done' && i.convertedSize)
    .reduce((acc, cur) => acc + (cur.convertedSize || 0), 0);

  return (
    <div
      id="batch-progress-bar"
      className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-md flex flex-col gap-3 transition-all"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status indicator */}
        <div className="flex items-center gap-2.5">
          {isProcessing ? (
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs sm:text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>多线程高保真转换中 ({doneCount}/{total})</span>
            </div>
          ) : doneCount === total ? (
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs sm:text-sm">
              <CheckCheck className="w-4 h-4" />
              <span>全部 PNG 已完成高保真转换 ({total}/{total})</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-200 font-medium text-xs sm:text-sm">
              <span>待处理队列: <strong>{pendingCount}</strong> 张未转换</span>
            </div>
          )}

          {processingCount > 0 && (
            <span className="text-[11px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono">
              {processingCount} 线程并行
            </span>
          )}
        </div>

        {/* Data summary */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs text-slate-300 font-mono">
          <span>
            原图: <strong>{formatBytes(totalOriginalSize)}</strong>
          </span>
          {totalConvertedSize > 0 && (
            <>
              <span className="text-slate-700">|</span>
              <span>
                JPG: <strong className="text-amber-300">{formatBytes(totalConvertedSize)}</strong>
              </span>
            </>
          )}
          <span className="font-bold text-amber-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            {percent}%
          </span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden relative">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Bottom control row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5 text-xs">
        <div className="text-slate-400 flex items-center gap-1.5 text-[11px] sm:text-xs">
          <span>导出形式:</span>
          <span className="text-slate-200 font-medium bg-slate-800 px-2 py-0.5 rounded border border-slate-700 font-mono">
            {dirConfig.directoryHandle
              ? `📁 本地目录 "${dirConfig.directoryName}" (直接写入)`
              : dirConfig.mode === 'zip'
              ? '📦 ZIP 打包下载'
              : '💾 浏览器直接下载'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              onClick={onStartConvertAll}
              disabled={isProcessing}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition disabled:opacity-50 cursor-pointer shadow-sm active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>转换未完成 ({pendingCount})</span>
            </button>
          )}

          {doneCount > 0 && (
            <button
              onClick={onExportAll}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition disabled:opacity-50 cursor-pointer shadow-sm active:scale-95"
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>
                {dirConfig.directoryHandle
                  ? `写入至 "${dirConfig.directoryName}" (${doneCount})`
                  : `导出全部 JPG (${doneCount})`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
