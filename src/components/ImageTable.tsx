import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  Clock,
  ArrowRight,
  Maximize2,
  Search,
  CheckSquare,
  Square,
  MinusSquare,
  ArrowUpDown,
  Filter,
  Layers,
  FolderDown,
} from 'lucide-react';
import { ImageItem, ConversionConfig, TableFilterType, TableSortField, TableSortOrder } from '../types';
import { formatBytes, getOutputFilename } from '../utils/imageConverter';

interface ImageTableProps {
  items: ImageItem[];
  config: ConversionConfig;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onSelectOnlyDone: () => void;
  onClearSelection: () => void;
  onBatchDownloadSelected: () => void;
  onBatchReconvertSelected: () => void;
  onBatchRemoveSelected: () => void;
  onConvertSingle: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onPreviewCompare: (item: ImageItem) => void;
  onDownloadSingle: (item: ImageItem) => void;
  isProcessing: boolean;
}

export const ImageTable: React.FC<ImageTableProps> = ({
  items,
  config,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onSelectOnlyDone,
  onClearSelection,
  onBatchDownloadSelected,
  onBatchReconvertSelected,
  onBatchRemoveSelected,
  onConvertSingle,
  onRemoveItem,
  onPreviewCompare,
  onDownloadSingle,
  isProcessing,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<TableFilterType>('all');
  const [sortField, setSortField] = useState<TableSortField>('index');
  const [sortOrder, setSortOrder] = useState<TableSortOrder>('asc');

  if (items.length === 0) return null;

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Status Filter
      if (filterType === 'done' && item.status !== 'done') return false;
      if (filterType === 'idle' && item.status !== 'idle' && item.status !== 'processing') return false;
      if (filterType === 'error' && item.status !== 'error') return false;

      // 2. Search Filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(query);
        return matchesName;
      }

      return true;
    });
  }, [items, filterType, searchTerm]);

  // Sort items
  const sortedItems = useMemo(() => {
    if (sortField === 'index') return filteredItems;

    return [...filteredItems].sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortField === 'size') {
        valA = a.originalSize;
        valB = b.originalSize;
      } else if (sortField === 'status') {
        valA = a.status;
        valB = b.status;
      } else if (sortField === 'duration') {
        valA = a.durationMs || 0;
        valB = b.durationMs || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredItems, sortField, sortOrder]);

  const handleSortToggle = (field: TableSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const isAllFilteredSelected =
    sortedItems.length > 0 && sortedItems.every((i) => selectedIds.has(i.id));
  const isPartiallySelected =
    sortedItems.some((i) => selectedIds.has(i.id)) && !isAllFilteredSelected;

  const doneCount = items.filter((i) => i.status === 'done').length;
  const pendingCount = items.filter((i) => i.status === 'idle' || i.status === 'processing').length;
  const errorCount = items.filter((i) => i.status === 'error').length;

  return (
    <div id="image-workbench-table" className="bg-slate-900/90 rounded-2xl border border-slate-800/90 overflow-hidden shadow-lg flex flex-col">
      {/* Table Toolbar: Search, Status Filter Tabs, Batch Selection Status */}
      <div className="p-3.5 sm:p-4 bg-slate-950/70 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              filterType === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>全部</span>
            <span className="text-[11px] opacity-80">({items.length})</span>
          </button>

          <button
            onClick={() => setFilterType('done')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              filterType === 'done'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>已就绪</span>
            <span className="text-[11px] opacity-80">({doneCount})</span>
          </button>

          {pendingCount > 0 && (
            <button
              onClick={() => setFilterType('idle')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                filterType === 'idle'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>待转换</span>
              <span className="text-[11px] opacity-80">({pendingCount})</span>
            </button>
          )}

          {errorCount > 0 && (
            <button
              onClick={() => setFilterType('error')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                filterType === 'error'
                  ? 'bg-red-500 text-white font-bold'
                  : 'text-red-400 hover:text-red-300'
              }`}
            >
              <span>异常</span>
              <span className="text-[11px] opacity-80">({errorCount})</span>
            </button>
          )}
        </div>

        {/* Right: Search Input & Quick Selection Helpers */}
        <div className="flex items-center gap-2.5 flex-1 max-w-sm justify-end">
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="按文件名搜索..."
              className="w-full bg-slate-900 text-slate-200 text-xs pl-8 pr-7 py-1.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500 placeholder:text-slate-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating / Sticky Batch Action Bar when rows are selected */}
      {selectedIds.size > 0 && (
        <div
          id="batch-selection-action-bar"
          className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-amber-300 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              已选择 {selectedIds.size} 项图片
            </span>
            <button
              onClick={onClearSelection}
              className="text-slate-400 hover:text-white underline cursor-pointer text-[11px]"
            >
              取消选择
            </button>
            <button
              onClick={onSelectOnlyDone}
              className="text-emerald-400 hover:text-emerald-300 underline cursor-pointer text-[11px]"
            >
              仅选已完成项
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBatchReconvertSelected}
              disabled={isProcessing}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 text-xs font-semibold cursor-pointer transition"
              title="使用当前参数重新转换选中的图片"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>重新转换选中项</span>
            </button>

            <button
              onClick={onBatchDownloadSelected}
              disabled={isProcessing}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition shadow-sm"
              title="导出选中的已完成 JPG"
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>导出选中项</span>
            </button>

            <button
              onClick={onBatchRemoveSelected}
              disabled={isProcessing}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/30 text-xs font-medium cursor-pointer transition"
              title="从列表中移除选中项"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>删除选中</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm text-slate-300">
          <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px] select-none">
            <tr>
              {/* Checkbox & Master Select */}
              <th className="py-3 px-3 w-10 text-center">
                <button
                  onClick={() => {
                    if (isAllFilteredSelected) {
                      onClearSelection();
                    } else {
                      onSelectAll();
                    }
                  }}
                  className="text-slate-400 hover:text-amber-400 cursor-pointer flex items-center justify-center p-1"
                  title={isAllFilteredSelected ? '取消全选' : '全选当前过滤结果'}
                >
                  {isAllFilteredSelected ? (
                    <CheckSquare className="w-4 h-4 text-amber-400" />
                  ) : isPartiallySelected ? (
                    <MinusSquare className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>

              {/* Index */}
              <th className="py-3 px-2 w-10 text-center text-slate-500">#</th>

              {/* Thumbnail & File Name */}
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-200 transition"
                onClick={() => handleSortToggle('name')}
              >
                <div className="flex items-center gap-1">
                  <span>原图 PNG / 输出 JPG 文件名</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              {/* Resolution */}
              <th className="py-3 px-4">原始分辨率</th>

              {/* Original Size */}
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-200 transition"
                onClick={() => handleSortToggle('size')}
              >
                <div className="flex items-center gap-1">
                  <span>原始大小</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              {/* Converted JPG Status & Size */}
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-200 transition"
                onClick={() => handleSortToggle('status')}
              >
                <div className="flex items-center gap-1">
                  <span>输出 JPG 状态 / 大小</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              {/* Processing Duration */}
              <th
                className="py-3 px-4 text-center cursor-pointer hover:text-slate-200 transition"
                onClick={() => handleSortToggle('duration')}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>耗时</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              {/* Actions */}
              <th className="py-3 px-4 text-right">操作</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/80">
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Filter className="w-6 h-6 text-slate-600" />
                    <p className="text-sm font-medium text-slate-400">没有符合筛选条件的图片</p>
                    {(searchTerm || filterType !== 'all') && (
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setFilterType('all');
                        }}
                        className="text-xs text-amber-400 hover:underline cursor-pointer"
                      >
                        重置所有筛选与搜索
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              sortedItems.map((item) => {
                const originalIndex = items.findIndex((i) => i.id === item.id);
                const itemIdxNumber = originalIndex !== -1 ? originalIndex + 1 : 1;
                const outputName = getOutputFilename(item.name, config, itemIdxNumber);

                const isDone = item.status === 'done';
                const isProcessingItem = item.status === 'processing';
                const isError = item.status === 'error';
                const isIdle = item.status === 'idle';
                const isSelected = selectedIds.has(item.id);

                // Calculate size difference
                let sizeDiffText = '';
                let sizePercent = 0;
                if (isDone && item.convertedSize) {
                  const diff = item.convertedSize - item.originalSize;
                  sizePercent = Math.round((diff / item.originalSize) * 100);
                  sizeDiffText = sizePercent <= 0 ? `${sizePercent}%` : `+${sizePercent}%`;
                }

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-800/40 transition-colors group ${
                      isSelected ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    {/* Row Checkbox */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onToggleSelect(item.id)}
                        className="text-slate-500 hover:text-amber-400 cursor-pointer flex items-center justify-center p-1"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* Index */}
                    <td className="py-3 px-2 text-center text-slate-500 font-mono text-xs">
                      {itemIdxNumber}
                    </td>

                    {/* Thumbnail & Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-700/80 overflow-hidden relative flex items-center justify-center shrink-0 group-hover:border-amber-500/50 transition cursor-pointer shadow-inner"
                          onClick={() => onPreviewCompare(item)}
                          title="点击查看原图与 JPG 高保真对比预览"
                        >
                          <img
                            src={item.originalUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <Maximize2 className="w-4 h-4 text-white" />
                          </div>
                        </div>

                        <div className="min-w-0 max-w-xs sm:max-w-sm">
                          <div className="font-medium text-slate-100 truncate flex items-center gap-1.5" title={item.name}>
                            <span className="truncate">{item.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5 font-mono">
                            <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="text-amber-300/90 truncate">{outputName}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Resolution */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.originalWidth > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800/90 text-slate-200 font-mono text-xs border border-slate-700/80">
                          {item.originalWidth} × {item.originalHeight} px
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">检测中...</span>
                      )}
                    </td>

                    {/* Original Size */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-300 text-xs">
                      {formatBytes(item.originalSize)}
                    </td>

                    {/* Converted JPG Status & Size */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {isIdle && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          <Clock className="w-3 h-3 text-slate-400" />
                          待转换
                        </span>
                      )}

                      {isProcessingItem && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                          <span className="text-xs font-semibold text-amber-400">
                            正在编码...
                          </span>
                        </div>
                      )}

                      {isDone && (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            已就绪
                          </span>
                          <span className="font-mono text-xs text-slate-200">
                            {formatBytes(item.convertedSize || 0)}
                          </span>
                          {sizeDiffText && (
                            <span
                              className={`text-[11px] font-mono px-1.5 py-0.2 rounded ${
                                sizePercent <= 0
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {sizeDiffText}
                            </span>
                          )}
                        </div>
                      )}

                      {isError && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-300 border border-red-500/20"
                          title={item.error}
                        >
                          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                          转换异常
                        </span>
                      )}
                    </td>

                    {/* Processing Duration */}
                    <td className="py-3 px-4 text-center font-mono text-xs text-slate-400 whitespace-nowrap">
                      {item.durationMs !== undefined ? `${item.durationMs} ms` : '-'}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 sm:gap-1.5">
                        {isDone && (
                          <>
                            <button
                              onClick={() => onPreviewCompare(item)}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer"
                              title="对比原图与 JPG 画质"
                            >
                              <Eye className="w-4 h-4 text-amber-400" />
                            </button>
                            <button
                              onClick={() => onDownloadSingle(item)}
                              className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white transition border border-emerald-500/30 cursor-pointer"
                              title="下载此张 JPG"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {(isIdle || isError) && (
                          <button
                            onClick={() => onConvertSingle(item.id)}
                            disabled={isProcessing}
                            className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 transition border border-amber-500/30 cursor-pointer disabled:opacity-40"
                            title="开始转换"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => onRemoveItem(item.id)}
                          disabled={isProcessing}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-40 cursor-pointer"
                          title="从列表中移除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
