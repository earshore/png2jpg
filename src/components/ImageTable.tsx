import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  ArrowUp,
  ArrowDown,
  Filter,
  FolderDown,
  Edit3,
  Edit2,
  RotateCcw,
  Sparkles,
  Info,
  Check,
  X,
  FileCode,
  Layers,
  ChevronUp,
  ChevronDown,
  Shuffle,
  SortAsc,
  ListOrdered,
} from 'lucide-react';
import {
  ImageItem,
  ConversionConfig,
  TableFilterType,
  TableSortField,
  TableSortOrder,
  ImageMetadata,
} from '../types';
import { formatBytes, getOutputFilename, resolveDynamicTokens } from '../utils/imageConverter';

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
  onBulkRename?: (
    selectedIds: Set<string>,
    pattern: string,
    startIndex?: number,
    orderedIds?: string[]
  ) => void;
  onResetNames?: (selectedIds: Set<string>) => void;
  onRenameSingle?: (id: string, newName: string) => void;
  onReorderItems?: (newOrderedItems: ImageItem[]) => void;
  onMoveItem?: (id: string, direction: 'up' | 'down') => void;
  onMoveItemToPosition?: (id: string, targetPosition1Based: number) => void;
  onConvertSingle: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onPreviewCompare: (item: ImageItem) => void;
  onDownloadSingle: (item: ImageItem) => void;
  isProcessing: boolean;
}

const BULK_RENAME_PRESET_PATTERNS = [
  { label: 'IMG_{index:3}', pattern: 'IMG_{index:3}', desc: '三位序号: IMG_001, IMG_002...' },
  {
    label: 'Photo_{date}_{index:2}',
    pattern: 'Photo_{date}_{index:2}',
    desc: '日期+两位序号: Photo_2026-08-25_01',
  },
  { label: '{name}_HD', pattern: '{name}_HD', desc: '保留原名并加高清后缀' },
  { label: 'Item_{index}', pattern: 'Item_{index}', desc: '标准自然递增序号' },
];

const TOKEN_SUGGESTIONS = [
  { token: '{index}', label: '自然序号 (1, 2, 3...)' },
  { token: '{index:2}', label: '两位序号 (01, 02...)' },
  { token: '{index:3}', label: '三位序号 (001, 002...)' },
  { token: '{name}', label: '原文件名 (Base Name)' },
  { token: '{date}', label: '当前日期 (YYYY-MM-DD)' },
  { token: '{timestamp}', label: '精确时间戳' },
];

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
  onBulkRename,
  onResetNames,
  onRenameSingle,
  onReorderItems,
  onMoveItem,
  onMoveItemToPosition,
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

  // Bulk rename modal state
  const [showBulkRenameModal, setShowBulkRenameModal] = useState(false);
  const [renamePattern, setRenamePattern] = useState('IMG_{index:3}');
  const [renameStartIndex, setRenameStartIndex] = useState(1);
  const [modalOrderedItems, setModalOrderedItems] = useState<ImageItem[]>([]);

  // Single inline editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');

  // Manual sequence number editing in Main Table
  const [editingIndexItemId, setEditingIndexItemId] = useState<string | null>(null);
  const [editingIndexValue, setEditingIndexValue] = useState('');

  // Manual sequence number editing in Bulk Rename Modal
  const [editingModalIndexId, setEditingModalIndexId] = useState<string | null>(null);
  const [editingModalIndexValue, setEditingModalIndexValue] = useState('');

  // Large Image Hover Preview state with viewport clamping (小图悬停放大图预览)
  const [hoveredImagePreview, setHoveredImagePreview] = useState<{
    item: ImageItem;
    x: number;
    y: number;
  } | null>(null);
  const imagePreviewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Active hover PNG Metadata Tooltip item with clamped screen viewport coordinates (分辨率/属性悬停元数据)
  const [hoveredMetadataItem, setHoveredMetadataItem] = useState<{
    item: ImageItem;
    x: number;
    y: number;
  } | null>(null);
  const hoverMetadataTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close modals on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showBulkRenameModal) setShowBulkRenameModal(false);
        if (editingItemId) setEditingItemId(null);
        if (editingIndexItemId) setEditingIndexItemId(null);
        if (editingModalIndexId) setEditingModalIndexId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showBulkRenameModal, editingItemId, editingIndexItemId, editingModalIndexId]);

  if (items.length === 0) return null;

  // 1. Filter items by status and search keyword
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Status Filter
      if (filterType === 'done' && item.status !== 'done') return false;
      if (filterType === 'idle' && item.status !== 'idle') return false;
      if (filterType === 'processing' && item.status !== 'processing') return false;
      if (filterType === 'error' && item.status !== 'error') return false;

      // Search Filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesOriginalName = item.file.name.toLowerCase().includes(query);
        return matchesName || matchesOriginalName;
      }

      return true;
    });
  }, [items, filterType, searchTerm]);

  // 2. Sort items with natural string and numeric support
  const sortedItems = useMemo(() => {
    if (sortField === 'index') {
      return sortOrder === 'asc' ? filteredItems : [...filteredItems].reverse();
    }

    return [...filteredItems].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'name') {
        // Natural language sort e.g. "image2.png" before "image10.png"
        comparison = a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      } else if (sortField === 'size') {
        comparison = a.originalSize - b.originalSize;
      } else if (sortField === 'resolution') {
        const pixelsA = (a.originalWidth || 0) * (a.originalHeight || 0);
        const pixelsB = (b.originalWidth || 0) * (b.originalHeight || 0);
        comparison = pixelsA - pixelsB;
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status);
      } else if (sortField === 'duration') {
        comparison = (a.durationMs || 0) - (b.durationMs || 0);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredItems, sortField, sortOrder]);

  const handleSortToggle = (field: TableSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Quick sort selection change from dropdown
  const handleSortSelectChange = (val: string) => {
    if (val === 'default') {
      setSortField('index');
      setSortOrder('asc');
    } else if (val === 'name-asc') {
      setSortField('name');
      setSortOrder('asc');
    } else if (val === 'name-desc') {
      setSortField('name');
      setSortOrder('desc');
    } else if (val === 'size-asc') {
      setSortField('size');
      setSortOrder('asc');
    } else if (val === 'size-desc') {
      setSortField('size');
      setSortOrder('desc');
    } else if (val === 'res-asc') {
      setSortField('resolution');
      setSortOrder('asc');
    } else if (val === 'res-desc') {
      setSortField('resolution');
      setSortOrder('desc');
    }
  };

  // Permanently apply active sorted order to master queue
  const handleApplySortAsMasterOrder = () => {
    if (onReorderItems && sortedItems.length > 0) {
      onReorderItems(sortedItems);
      setSortField('index');
      setSortOrder('asc');
    }
  };

  // Reverse current master order
  const handleReverseMasterOrder = () => {
    if (onReorderItems) {
      onReorderItems([...items].reverse());
      setSortField('index');
      setSortOrder('asc');
    }
  };

  const isAllFilteredSelected =
    sortedItems.length > 0 && sortedItems.every((i) => selectedIds.has(i.id));
  const isPartiallySelected =
    sortedItems.some((i) => selectedIds.has(i.id)) && !isAllFilteredSelected;

  const totalCount = items.length;
  const doneCount = items.filter((i) => i.status === 'done').length;
  const processingCount = items.filter((i) => i.status === 'processing').length;
  const idleCount = items.filter((i) => i.status === 'idle').length;
  const errorCount = items.filter((i) => i.status === 'error').length;

  // Selected items strictly matching current active sorted sequence
  const selectedSortedItemsList = useMemo(() => {
    return sortedItems.filter((i) => selectedIds.has(i.id));
  }, [sortedItems, selectedIds]);

  // Synchronize modal items whenever the modal is opened or selection changes
  useEffect(() => {
    if (showBulkRenameModal) {
      setModalOrderedItems(selectedSortedItemsList);
    }
  }, [showBulkRenameModal, selectedSortedItemsList]);

  // Manual sequence number submit in Main Table
  const handleIndexSubmit = (itemId: string) => {
    const parsed = parseInt(editingIndexValue.trim(), 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= items.length) {
      if (onMoveItemToPosition) {
        onMoveItemToPosition(itemId, parsed);
      } else if (onReorderItems) {
        const sourceIndex = items.findIndex((i) => i.id === itemId);
        const targetIndex = parsed - 1;
        if (sourceIndex !== -1 && sourceIndex !== targetIndex) {
          const copy = [...items];
          const [moved] = copy.splice(sourceIndex, 1);
          copy.splice(targetIndex, 0, moved);
          onReorderItems(copy);
        }
      }
      setSortField('index');
      setSortOrder('asc');
    }
    setEditingIndexItemId(null);
  };

  // Manual sequence number jump inside Bulk Rename Modal
  const handleModalIndexSubmit = (itemId: string) => {
    const parsed = parseInt(editingModalIndexValue.trim(), 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= modalOrderedItems.length) {
      const targetIdx = parsed - 1;
      setModalOrderedItems((prev) => {
        const sourceIdx = prev.findIndex((i) => i.id === itemId);
        if (sourceIdx === -1 || sourceIdx === targetIdx) return prev;
        const copy = [...prev];
        const [moved] = copy.splice(sourceIdx, 1);
        copy.splice(targetIdx, 0, moved);
        return copy;
      });
    }
    setEditingModalIndexId(null);
  };

  // Move single item up or down in Bulk Rename Modal
  const moveModalItem = (index: number, direction: 'up' | 'down') => {
    setModalOrderedItems((prev) => {
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      const copy = [...prev];
      const [removed] = copy.splice(index, 1);
      copy.splice(targetIdx, 0, removed);
      return copy;
    });
  };

  // Quick sorting utilities inside Bulk Rename Modal
  const sortModalItems = (mode: 'name-asc' | 'name-desc' | 'reverse' | 'reset') => {
    if (mode === 'reset') {
      setModalOrderedItems(selectedSortedItemsList);
    } else if (mode === 'reverse') {
      setModalOrderedItems((prev) => [...prev].reverse());
    } else if (mode === 'name-asc') {
      setModalOrderedItems((prev) =>
        [...prev].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        )
      );
    } else if (mode === 'name-desc') {
      setModalOrderedItems((prev) =>
        [...prev].sort((a, b) =>
          b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' })
        )
      );
    }
  };

  // Handle single item inline rename submit
  const handleInlineRenameSubmit = (id: string) => {
    if (onRenameSingle && inlineEditValue.trim()) {
      onRenameSingle(id, inlineEditValue.trim());
    }
    setEditingItemId(null);
  };

  /**
   * Hover Thumbnail -> Display High-Definition Large Image Floating Preview with Screen Viewport Clamping
   */
  const handleMouseEnterThumbnail = (e: React.MouseEvent, item: ImageItem) => {
    if (imagePreviewTimeoutRef.current) clearTimeout(imagePreviewTimeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const previewWidth = 320;
    const previewHeight = 350;
    const margin = 16;

    // Place popup to the right of thumbnail if space permits, otherwise left or center
    let x = rect.right + 12;
    if (x + previewWidth > window.innerWidth - margin) {
      x = rect.left - previewWidth - 12;
      if (x < margin) {
        x = Math.max(margin, (window.innerWidth - previewWidth) / 2);
      }
    }

    // Align with top of thumbnail and clamp vertically to avoid clipping
    let y = rect.top - 24;
    if (y + previewHeight > window.innerHeight - margin) {
      y = window.innerHeight - previewHeight - margin;
    }
    if (y < margin) {
      y = margin;
    }

    setHoveredImagePreview({ item, x, y });
  };

  const handleMouseLeaveThumbnail = () => {
    imagePreviewTimeoutRef.current = setTimeout(() => {
      setHoveredImagePreview(null);
    }, 80);
  };

  /**
   * Hover Resolution/Properties -> Display PNG Original Metadata Tooltip (PNG原图元属性保持不变)
   */
  const handleMouseEnterMetadata = (e: React.MouseEvent, item: ImageItem) => {
    if (hoverMetadataTimeoutRef.current) clearTimeout(hoverMetadataTimeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipWidth = 320;
    const tooltipHeight = 290;
    const margin = 14;

    // Horizontal clamping: align near trigger, but keep strictly within window bounds
    let x = rect.left;
    if (x + tooltipWidth > window.innerWidth - margin) {
      x = window.innerWidth - tooltipWidth - margin;
    }
    if (x < margin) {
      x = margin;
    }

    // Vertical positioning: try below first, flip above if bottom overflows
    let y = rect.bottom + 8;
    if (y + tooltipHeight > window.innerHeight - margin) {
      const aboveY = rect.top - tooltipHeight - 8;
      if (aboveY >= margin) {
        y = aboveY;
      } else {
        y = Math.max(margin, window.innerHeight - tooltipHeight - margin);
      }
    }

    setHoveredMetadataItem({ item, x, y });
  };

  const handleMouseLeaveMetadata = () => {
    hoverMetadataTimeoutRef.current = setTimeout(() => {
      setHoveredMetadataItem(null);
    }, 80);
  };

  return (
    <div
      id="image-workbench-table"
      className="bg-slate-900/90 rounded-2xl border border-slate-800/90 overflow-hidden shadow-xl flex flex-col transition-all"
    >
      {/* Table Toolbar: Search, Status Filter Dropdown, Sorting Dropdown & Quick Tabs */}
      <div className="p-3.5 sm:p-4 bg-slate-950/70 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Status Filter Dropdown & Quick Tabs */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs shadow-inner">
            <Filter className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-400 font-semibold hidden sm:inline">状态:</span>
            <select
              id="select-status-filter"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as TableFilterType)}
              className="bg-transparent text-slate-100 text-xs font-semibold focus:outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-slate-900 text-slate-200">
                全部状态 ({totalCount})
              </option>
              <option value="done" className="bg-slate-900 text-emerald-400">
                已就绪 / 完成 ({doneCount})
              </option>
              <option value="processing" className="bg-slate-900 text-amber-400">
                正在转换中 ({processingCount})
              </option>
              <option value="idle" className="bg-slate-900 text-slate-300">
                待转换排队 ({idleCount})
              </option>
              <option value="error" className="bg-slate-900 text-red-400">
                转换异常 ({errorCount})
              </option>
            </select>
          </div>

          {/* Sort Selection Control */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs shadow-inner">
            <SortAsc className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-400 font-semibold hidden sm:inline">排序:</span>
            <select
              id="select-sort-mode"
              value={
                sortField === 'index'
                  ? 'default'
                  : `${sortField === 'resolution' ? 'res' : sortField}-${sortOrder}`
              }
              onChange={(e) => handleSortSelectChange(e.target.value)}
              className="bg-transparent text-slate-100 text-xs font-semibold focus:outline-none cursor-pointer pr-1"
            >
              <option value="default" className="bg-slate-900 text-slate-200">
                默认添加顺序
              </option>
              <option value="name-asc" className="bg-slate-900 text-amber-300">
                按文件名 A → Z (升序)
              </option>
              <option value="name-desc" className="bg-slate-900 text-amber-300">
                按文件名 Z → A (降序)
              </option>
              <option value="size-asc" className="bg-slate-900 text-slate-200">
                按文件大小 (小 → 大)
              </option>
              <option value="size-desc" className="bg-slate-900 text-slate-200">
                按文件大小 (大 → 小)
              </option>
              <option value="res-asc" className="bg-slate-900 text-slate-200">
                按分辨率 (小 → 大)
              </option>
              <option value="res-desc" className="bg-slate-900 text-slate-200">
                按分辨率 (大 → 小)
              </option>
            </select>
          </div>

          {/* Quick Action: Apply current sort or reverse */}
          {sortField !== 'index' && onReorderItems && (
            <button
              onClick={handleApplySortAsMasterOrder}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/40 text-xs font-semibold cursor-pointer transition shadow-sm"
              title="将当前排序结果固化为默认队列序号"
            >
              <Check className="w-3.5 h-3.5" />
              <span>固化此排序</span>
            </button>
          )}

          {onReorderItems && (
            <button
              onClick={handleReverseMasterOrder}
              className="hidden lg:inline-flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium cursor-pointer transition"
              title="反转当前列表顺序"
            >
              <Shuffle className="w-3.5 h-3.5 text-slate-400" />
              <span>倒序</span>
            </button>
          )}

          {/* Filter Quick Pills */}
          <div className="hidden xl:flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                filterType === 'all'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>全部</span>
              <span className="text-[10px] opacity-80">({totalCount})</span>
            </button>

            <button
              onClick={() => setFilterType('done')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                filterType === 'done'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>就绪</span>
              <span className="text-[10px] opacity-80">({doneCount})</span>
            </button>

            {processingCount > 0 && (
              <button
                onClick={() => setFilterType('processing')}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                  filterType === 'processing'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-amber-400 hover:text-amber-300'
                }`}
              >
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>处理中</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Search Input */}
        <div className="flex items-center gap-2.5 flex-1 max-w-xs justify-end ml-auto">
          <div className="relative w-full">
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
          <div className="flex items-center gap-2.5 flex-wrap">
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
              仅选已就绪项
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bulk Rename Button */}
            {onBulkRename && (
              <button
                id="btn-batch-rename"
                onClick={() => setShowBulkRenameModal(true)}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/40 text-xs font-semibold cursor-pointer transition shadow-sm"
                title="按当前排序序号批量重命名选中的图片"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>按序重命名 ({selectedIds.size})</span>
              </button>
            )}

            {/* Re-convert Selected */}
            <button
              onClick={onBatchReconvertSelected}
              disabled={isProcessing}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 text-xs font-semibold cursor-pointer transition"
              title="使用当前参数重新转换选中的图片"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>重新转换</span>
            </button>

            {/* Export Selected */}
            <button
              onClick={onBatchDownloadSelected}
              disabled={isProcessing}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition shadow-sm"
              title="导出选中的已完成 JPG"
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>导出选中项</span>
            </button>

            {/* Delete Selected */}
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
                  title={isAllFilteredSelected ? '取消全选' : '全选当前结果'}
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

              {/* Index Column with Sort */}
              <th
                className="py-3 px-2 w-14 text-center cursor-pointer hover:text-slate-200 transition"
                onClick={() => handleSortToggle('index')}
                title="按导入顺序排序"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>#</span>
                  {sortField === 'index' && (
                    <span className="text-amber-400">
                      {sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    </span>
                  )}
                </div>
              </th>

              {/* Thumbnail & File Name */}
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-200 transition"
                onClick={() => handleSortToggle('name')}
                title="点击按文件名排序"
              >
                <div className="flex items-center gap-1.5">
                  <span>原图 PNG / 输出 JPG 文件名</span>
                  {sortField === 'name' ? (
                    <span className="text-amber-400">
                      {sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    </span>
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  )}
                </div>
              </th>

              {/* Resolution & Metadata Badge */}
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-200 transition"
                onClick={() => handleSortToggle('resolution')}
                title="点击按像素分辨率大小排序"
              >
                <div className="flex items-center gap-1.5">
                  <span>原始分辨率 / 属性</span>
                  {sortField === 'resolution' ? (
                    <span className="text-amber-400">
                      {sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    </span>
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  )}
                </div>
              </th>

              {/* Original Size */}
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-200 transition"
                onClick={() => handleSortToggle('size')}
                title="点击按文件大小排序"
              >
                <div className="flex items-center gap-1.5">
                  <span>原始大小</span>
                  {sortField === 'size' ? (
                    <span className="text-amber-400">
                      {sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    </span>
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  )}
                </div>
              </th>

              {/* Converted JPG Status & Size */}
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-200 transition"
                onClick={() => handleSortToggle('status')}
                title="点击按状态排序"
              >
                <div className="flex items-center gap-1.5">
                  <span>输出 JPG 状态 / 大小</span>
                  {sortField === 'status' ? (
                    <span className="text-amber-400">
                      {sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    </span>
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  )}
                </div>
              </th>

              {/* Processing Duration */}
              <th
                className="py-3 px-4 text-center cursor-pointer hover:text-slate-200 transition"
                onClick={() => handleSortToggle('duration')}
                title="点击按处理耗时排序"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>耗时</span>
                  {sortField === 'duration' ? (
                    <span className="text-amber-400">
                      {sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    </span>
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  )}
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
              sortedItems.map((item, visibleIdx) => {
                const originalIndex = items.findIndex((i) => i.id === item.id);
                // When sorted or ordered, visible display index shows current position
                const itemIdxNumber = visibleIdx + 1;
                const outputName = getOutputFilename(item.name, config, itemIdxNumber);

                const isDone = item.status === 'done';
                const isProcessingItem = item.status === 'processing';
                const isError = item.status === 'error';
                const isIdle = item.status === 'idle';
                const isSelected = selectedIds.has(item.id);
                const isEditing = editingItemId === item.id;

                // Calculate size difference
                let sizeDiffText = '';
                let sizePercent = 0;
                if (isDone && item.convertedSize) {
                  const diff = item.convertedSize - item.originalSize;
                  sizePercent = Math.round((diff / item.originalSize) * 100);
                  sizeDiffText = sizePercent <= 0 ? `${sizePercent}%` : `+${sizePercent}%`;
                }

                const meta = item.metadata;

                return (
                  <tr
                    key={item.id}
                    className={`transition-all group relative ${
                      isSelected ? 'bg-amber-500/5' : 'hover:bg-slate-800/40'
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

                    {/* Index Column with Editable Manual Sequence Number & Move Up/Down Controls */}
                    <td className="py-3 px-2 text-center text-slate-500 font-mono text-xs select-none">
                      <div className="flex items-center justify-center gap-1 group/idx">
                        {/* Editable Sequence Number */}
                        {editingIndexItemId === item.id ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="number"
                              min={1}
                              max={items.length}
                              value={editingIndexValue}
                              onChange={(e) => setEditingIndexValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleIndexSubmit(item.id);
                                if (e.key === 'Escape') setEditingIndexItemId(null);
                              }}
                              onBlur={() => handleIndexSubmit(item.id)}
                              autoFocus
                              className="w-12 h-6 px-1 text-center font-mono font-bold text-xs bg-slate-900 border border-amber-400 text-amber-300 rounded outline-none shadow-sm focus:ring-1 focus:ring-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              placeholder={String(itemIdxNumber)}
                              title="输入目标序号后按回车确定"
                            />
                            <button
                              type="button"
                              onClick={() => handleIndexSubmit(item.id)}
                              className="p-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 cursor-pointer"
                              title="确定移动至该序号"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingIndexItemId(item.id);
                              setEditingIndexValue(String(itemIdxNumber));
                            }}
                            className="min-w-6 px-1.5 py-0.5 rounded font-mono font-bold text-xs text-slate-300 bg-slate-800/80 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/40 border border-slate-700/60 transition cursor-pointer flex items-center justify-center gap-0.5 group/num"
                            title="点击输入新序号实现快速精准排序"
                          >
                            <span>{itemIdxNumber}</span>
                            <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover/num:opacity-100 text-amber-400 transition shrink-0" />
                          </button>
                        )}

                        {/* Up / Down Micro buttons */}
                        {onMoveItem && !editingIndexItemId && (
                          <div className="flex flex-col opacity-0 group-hover/idx:opacity-100 transition -ml-0.5 shrink-0">
                            <button
                              disabled={visibleIdx === 0 || isProcessing}
                              onClick={(e) => {
                                e.stopPropagation();
                                onMoveItem(item.id, 'up');
                              }}
                              className="text-slate-400 hover:text-amber-400 disabled:opacity-20 cursor-pointer p-0.5"
                              title="上移一位"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              disabled={visibleIdx === sortedItems.length - 1 || isProcessing}
                              onClick={(e) => {
                                e.stopPropagation();
                                onMoveItem(item.id, 'down');
                              }}
                              className="text-slate-400 hover:text-amber-400 disabled:opacity-20 cursor-pointer p-0.5"
                              title="下移一位"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Thumbnail & Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {/* Thumbnail with Hover-trigger for Large Image Preview */}
                        <div
                          className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-700/80 overflow-hidden relative flex items-center justify-center shrink-0 group-hover:border-amber-500/50 transition cursor-pointer shadow-inner"
                          onClick={() => onPreviewCompare(item)}
                          onMouseEnter={(e) => handleMouseEnterThumbnail(e, item)}
                          onMouseLeave={handleMouseLeaveThumbnail}
                          title="点击全屏对比，悬停预览高清大图"
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

                        {/* Name display or inline edit */}
                        <div className="min-w-0 max-w-xs sm:max-w-sm">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                autoFocus
                                value={inlineEditValue}
                                onChange={(e) => setInlineEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleInlineRenameSubmit(item.id);
                                  if (e.key === 'Escape') setEditingItemId(null);
                                }}
                                className="bg-slate-800 text-white text-xs px-2 py-1 rounded border border-amber-500 focus:outline-none w-48 font-mono"
                              />
                              <button
                                onClick={() => handleInlineRenameSubmit(item.id)}
                                className="p-1 rounded bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
                                title="确认"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingItemId(null)}
                                className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                                title="取消"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 group/name">
                              <div
                                className="font-medium text-slate-100 truncate cursor-default"
                                title={item.name}
                              >
                                {item.name}
                              </div>
                              {onRenameSingle && (
                                <button
                                  onClick={() => {
                                    setEditingItemId(item.id);
                                    setInlineEditValue(item.name.replace(/\.[^/.]+$/, ''));
                                  }}
                                  className="opacity-0 group-hover/name:opacity-100 text-slate-500 hover:text-amber-400 p-0.5 cursor-pointer transition"
                                  title="重命名此文件"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}

                          <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5 font-mono">
                            <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="text-amber-300/90 truncate">{outputName}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Resolution & Metadata trigger */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {item.originalWidth > 0 ? (
                          <div
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800/90 text-slate-200 font-mono text-xs border border-slate-700/80 cursor-help hover:border-amber-500/50 hover:text-amber-300 transition"
                            onMouseEnter={(e) => handleMouseEnterMetadata(e, item)}
                            onMouseLeave={handleMouseLeaveMetadata}
                            title="悬停查看 PNG 原始元数据属性"
                          >
                            <span>
                              {item.originalWidth} × {item.originalHeight}
                            </span>
                            {meta?.bitDepth && (
                              <span className="text-[10px] text-amber-400/90 font-sans">
                                {meta.bitDepth}位
                              </span>
                            )}
                            <Info className="w-3 h-3 text-slate-400" />
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">检测中...</span>
                        )}
                      </div>
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

      {/* Floating Detailed Metadata Tooltip Popover with Viewport Protection */}
      {hoveredMetadataItem &&
        createPortal(
          <div
            id="image-metadata-tooltip"
            className="fixed z-[120] bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-2xl shadow-2xl p-4 w-80 text-xs text-slate-200 pointer-events-none animate-in fade-in zoom-in-95 duration-100"
            style={{
              left: `${hoveredMetadataItem.x}px`,
              top: `${hoveredMetadataItem.y}px`,
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
              <div className="flex items-center gap-1.5 font-bold text-white truncate">
                <FileCode className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">{hoveredMetadataItem.item.name}</span>
              </div>
              <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                PNG 原图元数据
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-slate-300 font-mono text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px]">分辨率 & 像素:</span>
                <strong className="text-slate-100">
                  {hoveredMetadataItem.item.originalWidth} × {hoveredMetadataItem.item.originalHeight} px
                </strong>
                {hoveredMetadataItem.item.metadata?.megapixels && (
                  <span className="text-slate-400 block text-[10px]">
                    ({hoveredMetadataItem.item.metadata.megapixels})
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">宽高比:</span>
                <strong className="text-amber-400">
                  {hoveredMetadataItem.item.metadata?.aspectRatio || '-'}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">通道位深 (Bit Depth):</span>
                <strong className="text-slate-100">
                  {hoveredMetadataItem.item.metadata?.bitDepth
                    ? `${hoveredMetadataItem.item.metadata.bitDepth}-bit / 通道`
                    : '8-bit'}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">色彩模式 (Color Type):</span>
                <strong className="text-slate-100 truncate block">
                  {hoveredMetadataItem.item.metadata?.colorType || '真彩色 RGBA'}
                </strong>
              </div>

              <div className="col-span-2">
                <span className="text-slate-500 block text-[10px]">色彩空间与配置文件:</span>
                <strong className="text-emerald-400">
                  {hoveredMetadataItem.item.metadata?.colorSpace || 'sRGB 原彩色域 (标准)'}
                </strong>
              </div>

              {hoveredMetadataItem.item.metadata?.interlace && (
                <div>
                  <span className="text-slate-500 block text-[10px]">扫描方式:</span>
                  <span className="text-slate-300">
                    {hoveredMetadataItem.item.metadata.interlace}
                  </span>
                </div>
              )}

              {hoveredMetadataItem.item.metadata?.dpi && (
                <div>
                  <span className="text-slate-500 block text-[10px]">打印分辨率:</span>
                  <span className="text-slate-300">
                    {hoveredMetadataItem.item.metadata.dpi} DPI
                  </span>
                </div>
              )}

              <div className="col-span-2 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                <span>文件大小: {formatBytes(hoveredMetadataItem.item.originalSize)}</span>
                <span>MIME: {hoveredMetadataItem.item.metadata?.mimeType || 'image/png'}</span>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Floating High-Definition Large Image Preview Portal (小图悬停放大图预览) */}
      {hoveredImagePreview &&
        createPortal(
          <div
            id="image-large-preview-popup"
            className="fixed z-[130] bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-2xl shadow-2xl p-3 w-80 text-xs text-slate-200 pointer-events-none animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-2"
            style={{
              left: `${hoveredImagePreview.x}px`,
              top: `${hoveredImagePreview.y}px`,
            }}
          >
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-white truncate max-w-[200px]">
                <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{hoveredImagePreview.item.name}</span>
              </div>
              <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                高清大图预览
              </span>
            </div>

            {/* HD Image Canvas Box */}
            <div className="w-full h-52 rounded-xl bg-slate-950/90 border border-slate-800/80 overflow-hidden flex items-center justify-center relative shadow-inner">
              <img
                src={hoveredImagePreview.item.originalUrl}
                alt={hoveredImagePreview.item.name}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Footer Summary */}
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
              <span>
                {hoveredImagePreview.item.originalWidth > 0
                  ? `${hoveredImagePreview.item.originalWidth} × ${hoveredImagePreview.item.originalHeight} px`
                  : 'PNG'}
              </span>
              <span>{formatBytes(hoveredImagePreview.item.originalSize)}</span>
            </div>
          </div>,
          document.body
        )}

      {/* Bulk Renaming Modal Dialog respecting current sort order */}
      {showBulkRenameModal &&
        createPortal(
          <div
            id="bulk-rename-modal-backdrop"
            className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setShowBulkRenameModal(false)}
          >
            <div
              className="bg-slate-900 border border-slate-700/90 rounded-2xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-slate-200 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 font-bold text-white text-base">
                  <Edit3 className="w-5 h-5 text-amber-400" />
                  <span>按当前排序批量重命名 ({selectedIds.size} 项选中图片)</span>
                </div>
                <button
                  onClick={() => setShowBulkRenameModal(false)}
                  className="text-slate-400 hover:text-white text-sm cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition"
                  title="关闭 (Esc)"
                >
                  ✕
                </button>
              </div>

              {/* Main Renaming Form */}
              <div className="flex flex-col gap-3.5 overflow-y-auto pr-1">
                {/* Pattern Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    推荐命名模式:
                  </span>
                  {BULK_RENAME_PRESET_PATTERNS.map((p) => (
                    <button
                      key={p.pattern}
                      onClick={() => setRenamePattern(p.pattern)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition cursor-pointer ${
                        renamePattern === p.pattern
                          ? 'bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-sm'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                      }`}
                      title={p.desc}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Pattern Input & Start Index */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      重命名规则模版 (Pattern String):
                    </label>
                    <input
                      type="text"
                      value={renamePattern}
                      onChange={(e) => setRenamePattern(e.target.value)}
                      placeholder="如: IMG_{index:3} 或 Photo_{date}_{index}"
                      className="w-full bg-slate-800 text-amber-300 font-mono text-sm px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      起始序号:
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={renameStartIndex}
                      onChange={(e) => setRenameStartIndex(parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-slate-800 text-slate-100 font-mono text-sm px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Variable Token Chips */}
                <div className="flex items-center gap-1.5 flex-wrap bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-medium">点击插入变量:</span>
                  {TOKEN_SUGGESTIONS.map((t) => (
                    <button
                      key={t.token}
                      onClick={() => setRenamePattern((prev) => `${prev}${t.token}`)}
                      className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 hover:bg-amber-500 hover:text-slate-950 border border-slate-700 transition cursor-pointer"
                      title={t.label}
                    >
                      + {t.token}
                    </button>
                  ))}
                </div>

                {/* Sequence Reorder & Live Preview List */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 flex flex-col">
                  <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 text-xs font-semibold text-slate-300 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-amber-300">
                      <ListOrdered className="w-4 h-4 text-amber-400" />
                      <span>图片重命名序列（可点击序号精准输入或用 ↑↓ 调整）</span>
                    </span>

                    {/* Quick Reorder Toolbar inside modal */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                      <span className="text-slate-500 text-[10px] hidden sm:inline">快速排序:</span>
                      <button
                        type="button"
                        onClick={() => sortModalItems('name-asc')}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                        title="按原文件名 A→Z 升序排列"
                      >
                        A→Z
                      </button>
                      <button
                        type="button"
                        onClick={() => sortModalItems('name-desc')}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                        title="按原文件名 Z→A 降序排列"
                      >
                        Z→A
                      </button>
                      <button
                        type="button"
                        onClick={() => sortModalItems('reverse')}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                        title="反转当前队列顺序"
                      >
                        倒序
                      </button>
                      <button
                        type="button"
                        onClick={() => sortModalItems('reset')}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
                        title="恢复为进入时的排序"
                      >
                        重置
                      </button>
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60 font-mono text-xs">
                    {modalOrderedItems.length === 0 ? (
                      <div className="p-4 text-center text-slate-500">暂无选中的图片</div>
                    ) : (
                      modalOrderedItems.map((item, idx) => {
                        const curIndex = renameStartIndex + idx;
                        const originalBase = item.file.name.replace(/\.[^/.]+$/, '');
                        const newBase = resolveDynamicTokens(renamePattern, originalBase, curIndex);
                        const simulatedOutput = getOutputFilename(
                          `${newBase}.png`,
                          config,
                          curIndex
                        );

                        return (
                          <div
                            key={item.id}
                            className="p-2 sm:p-2.5 flex items-center justify-between gap-2.5 transition-all group hover:bg-slate-900/60"
                          >
                            {/* Left: Sequence Number, Thumbnail & Filename */}
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {/* Editable Modal Sequence Number */}
                              {editingModalIndexId === item.id ? (
                                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="number"
                                    min={1}
                                    max={modalOrderedItems.length}
                                    value={editingModalIndexValue}
                                    onChange={(e) => setEditingModalIndexValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleModalIndexSubmit(item.id);
                                      if (e.key === 'Escape') setEditingModalIndexId(null);
                                    }}
                                    onBlur={() => handleModalIndexSubmit(item.id)}
                                    autoFocus
                                    className="w-11 h-5 px-1 text-center font-mono font-bold text-[11px] bg-slate-900 border border-amber-400 text-amber-300 rounded outline-none shadow-sm focus:ring-1 focus:ring-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    placeholder={String(idx + 1)}
                                    title="输入新序号(1~N)后按回车确定"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleModalIndexSubmit(item.id)}
                                    className="p-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 cursor-pointer"
                                    title="确定修改序号"
                                  >
                                    <Check className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingModalIndexId(item.id);
                                    setEditingModalIndexValue(String(idx + 1));
                                  }}
                                  className="text-[10px] text-amber-400 font-bold bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0 cursor-pointer flex items-center gap-0.5 group/mnum transition"
                                  title="点击手动输入序号快速精准重排"
                                >
                                  <span>#{curIndex}</span>
                                  <Edit2 className="w-2 h-2 opacity-0 group-hover/mnum:opacity-100 text-amber-400 transition shrink-0" />
                                </button>
                              )}

                              <div
                                className="w-7 h-7 rounded-md bg-slate-900 border border-slate-700/80 overflow-hidden shrink-0 cursor-pointer hover:border-amber-500/60 transition"
                                onMouseEnter={(e) => handleMouseEnterThumbnail(e, item)}
                                onMouseLeave={handleMouseLeaveThumbnail}
                                title="悬停预览大图"
                              >
                                <img
                                  src={item.originalUrl}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>

                              <span
                                className="truncate text-slate-400 text-xs max-w-[110px] sm:max-w-[150px]"
                                title={item.file.name}
                              >
                                {item.file.name}
                              </span>
                            </div>

                            {/* Center: Dynamic Result Preview */}
                            <div className="flex items-center gap-1.5 min-w-0">
                              <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span
                                className="truncate font-semibold text-amber-300 text-xs max-w-[110px] sm:max-w-[160px]"
                                title={`${newBase}.png`}
                              >
                                {newBase}.png
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 hidden md:inline" />
                              <span
                                className="truncate text-emerald-300 text-[11px] max-w-[140px] hidden md:inline"
                                title={simulatedOutput}
                              >
                                {simulatedOutput}
                              </span>
                            </div>

                            {/* Right: Micro-step Up / Down buttons */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveModalItem(idx, 'up')}
                                className="p-1 rounded bg-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-700 disabled:opacity-20 cursor-pointer transition"
                                title="上移一位"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === modalOrderedItems.length - 1}
                                onClick={() => moveModalItem(idx, 'down')}
                                className="p-1 rounded bg-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-700 disabled:opacity-20 cursor-pointer transition"
                                title="下移一位"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between border-t border-slate-800 pt-3 flex-wrap gap-2">
                {onResetNames && (
                  <button
                    type="button"
                    onClick={() => {
                      onResetNames(selectedIds);
                      setShowBulkRenameModal(false);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>恢复原文件名</span>
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setShowBulkRenameModal(false)}
                    className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer transition"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onBulkRename && renamePattern.trim()) {
                        const orderedIds = modalOrderedItems.map((i) => i.id);
                        onBulkRename(
                          selectedIds,
                          renamePattern.trim(),
                          renameStartIndex,
                          orderedIds
                        );
                      }
                      setShowBulkRenameModal(false);
                    }}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer shadow-md transition"
                  >
                    <Check className="w-4 h-4" />
                    <span>应用重命名</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
