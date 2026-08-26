import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WorkbenchHeader } from './components/WorkbenchHeader';
import { ConversionSettingsBar } from './components/ConversionSettingsBar';
import { ProgressBar } from './components/ProgressBar';
import { ImageTable } from './components/ImageTable';
import { DropZone } from './components/DropZone';
import { CompareModal } from './components/CompareModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { ImageItem, ConversionConfig, DirectoryConfig } from './types';
import {
  inspectPngFile,
  convertPngToJpg,
  getOutputFilename,
  resolveDynamicTokens,
  runWithConcurrency,
} from './utils/imageConverter';
import { createSamplePngFiles } from './utils/sampleGenerator';
import JSZip from 'jszip';
import { CheckCircle2, AlertCircle, Info, Upload } from 'lucide-react';

const DEFAULT_CONFIG: ConversionConfig = {
  quality: 1.0, // 100% Lossless visual fidelity
  backgroundColor: '#FFFFFF', // Clean White background for alpha transparency
  extension: 'jpg',
  namePrefix: '',
  nameSuffix: '',
  autoStart: true,
};

const STORAGE_CONFIG_KEY = 'png2jpg_conversion_config_v1';

const DEFAULT_DIR_CONFIG: DirectoryConfig = {
  mode: 'zip',
  directoryHandle: null,
};

export function App() {
  const [items, setItems] = useState<ImageItem[]>([]);
  
  // Initialize config with localStorage persistence
  const [config, setConfig] = useState<ConversionConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load conversion config from localStorage:', e);
    }
    return DEFAULT_CONFIG;
  });

  const [dirConfig, setDirConfig] = useState<DirectoryConfig>(DEFAULT_DIR_CONFIG);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeCompareItem, setActiveCompareItem] = useState<ImageItem | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGlobalDragOver, setIsGlobalDragOver] = useState<boolean>(false);

  // Auto persist config to localStorage whenever user modifies it
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to save conversion config to localStorage:', e);
    }
  }, [config]);

  // Toast state
  const [toast, setToast] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const hiddenFileInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<any>(null);
  const dragCounterRef = useRef<number>(0);
  const handleFilesSelectedRef = useRef<((files: File[]) => Promise<void>) | null>(null);
  const lastImportedFilesRef = useRef<{ files: File[]; timestamp: number } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ text, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const handleConfigChange = (newConfig: Partial<ConversionConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  };

  const handleDirConfigChange = (newDirConfig: Partial<DirectoryConfig>) => {
    setDirConfig((prev) => ({ ...prev, ...newDirConfig }));
  };

  // Convert a single item helper
  const convertItem = async (
    item: ImageItem,
    cfg: ConversionConfig
  ): Promise<Partial<ImageItem>> => {
    try {
      const res = await convertPngToJpg(item.file, cfg);
      return {
        status: 'done',
        progress: 100,
        convertedBlob: res.blob,
        convertedUrl: res.url,
        convertedSize: res.size,
        convertedWidth: res.width,
        convertedHeight: res.height,
        durationMs: res.durationMs,
        error: undefined,
      };
    } catch (err: any) {
      return {
        status: 'error',
        progress: 0,
        error: err.message || '转换发生错误',
      };
    }
  };

  // Process a queue of items with high-speed async concurrency
  const processItemsQueue = async (
    queue: ImageItem[],
    currentConfig: ConversionConfig,
    forceReconvert = false
  ) => {
    const toProcess = queue.filter(
      (item) => forceReconvert || item.status === 'idle' || item.status === 'error'
    );
    if (toProcess.length === 0) return;

    setIsProcessing(true);

    // Mark as processing
    setItems((prev) =>
      prev.map((i) => {
        if (toProcess.some((p) => p.id === i.id)) {
          return { ...i, status: 'processing', progress: 30 };
        }
        return i;
      })
    );

    // Run parallel concurrency worker pool (concurrency limit = 4)
    await runWithConcurrency(toProcess, 4, async (item) => {
      const update = await convertItem(item, currentConfig);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, ...update } : i))
      );
    });

    setIsProcessing(false);
    showToast(`批量转换处理完成！`, 'success');
  };

  // Handle newly selected files
  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;

    // Guard against duplicate rapid invocation (e.g., bubbling or double-drop)
    const now = Date.now();
    if (
      lastImportedFilesRef.current &&
      now - lastImportedFilesRef.current.timestamp < 400 &&
      files.length === lastImportedFilesRef.current.files.length &&
      files.every(
        (f, i) =>
          f.name === lastImportedFilesRef.current?.files[i]?.name &&
          f.size === lastImportedFilesRef.current?.files[i]?.size
      )
    ) {
      return;
    }
    lastImportedFilesRef.current = { files, timestamp: now };

    const newItems: ImageItem[] = [];

    for (const file of files) {
      const id = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      try {
        const info = await inspectPngFile(file);
        newItems.push({
          id,
          file,
          name: file.name,
          originalSize: file.size,
          originalWidth: info.width,
          originalHeight: info.height,
          originalUrl: info.url,
          metadata: info.metadata,
          status: 'idle',
          progress: 0,
        });
      } catch (err) {
        newItems.push({
          id,
          file,
          name: file.name,
          originalSize: file.size,
          originalWidth: 0,
          originalHeight: 0,
          originalUrl: '',
          status: 'error',
          progress: 0,
          error: '无法读取文件内容',
        });
      }
    }

    setItems((prev) => {
      const combined = [...prev, ...newItems];
      if (config.autoStart) {
        setTimeout(() => {
          processItemsQueue(combined, config);
        }, 50);
      }
      return combined;
    });

    showToast(`已成功导入 ${newItems.length} 个 PNG 图片`, 'info');
  };

  handleFilesSelectedRef.current = handleFilesSelected;

  // Start conversion for all pending
  const handleStartAll = () => {
    processItemsQueue(items, config);
  };

  // Re-convert all items with current config
  const handleReconvertAll = () => {
    processItemsQueue(items, config, true);
  };

  // Convert single item
  const handleConvertSingle = async (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;

    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'processing', progress: 50 } : i))
    );

    const update = await convertItem(target, config);
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...update } : i))
    );
  };

  // Remove single item
  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) {
        if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
        if (item.convertedUrl) URL.revokeObjectURL(item.convertedUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Clear all items
  const handleClearAll = () => {
    items.forEach((item) => {
      if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
      if (item.convertedUrl) URL.revokeObjectURL(item.convertedUrl);
    });
    setItems([]);
    setSelectedIds(new Set());
    showToast('已清空列表', 'info');
  };

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(items.map((i) => i.id)));
  };

  const handleSelectOnlyDone = () => {
    setSelectedIds(new Set(items.filter((i) => i.status === 'done').map((i) => i.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Batch actions on selected
  const handleBatchDownloadSelected = async () => {
    const selectedItems = items.filter((i) => selectedIds.has(i.id) && i.status === 'done');
    if (selectedItems.length === 0) {
      showToast('选中的图片中暂无已完成的 JPG', 'info');
      return;
    }
    await exportItemsList(selectedItems);
  };

  const handleBatchReconvertSelected = () => {
    const selectedItems = items.filter((i) => selectedIds.has(i.id));
    if (selectedItems.length === 0) return;
    processItemsQueue(selectedItems, config, true);
  };

  const handleBatchRemoveSelected = () => {
    selectedIds.forEach((id) => {
      const item = items.find((i) => i.id === id);
      if (item) {
        if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
        if (item.convertedUrl) URL.revokeObjectURL(item.convertedUrl);
      }
    });
    setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
    setSelectedIds(new Set());
    showToast(`已移除选中的项`, 'info');
  };

  // Bulk rename selected items respecting custom drag/sort order
  const handleBulkRename = (
    selectedItemIds: Set<string>,
    pattern: string,
    startIndex = 1,
    orderedIds?: string[]
  ) => {
    const renameMap = new Map<string, string>();
    const orderToUse =
      orderedIds && orderedIds.length > 0
        ? orderedIds.filter((id) => selectedItemIds.has(id))
        : items.filter((i) => selectedItemIds.has(i.id)).map((i) => i.id);

    let counter = startIndex;
    for (const id of orderToUse) {
      const item = items.find((i) => i.id === id);
      if (item) {
        const originalBase = item.file.name.replace(/\.[^/.]+$/, '');
        const newBase = resolveDynamicTokens(pattern, originalBase, counter);
        renameMap.set(id, newBase);
        counter++;
      }
    }

    setItems((prev) => {
      // 1. Map updated names
      const itemMap = new Map<string, ImageItem>();
      prev.forEach((item) => {
        if (renameMap.has(item.id)) {
          const newBase = renameMap.get(item.id)!;
          itemMap.set(item.id, {
            ...item,
            name: newBase.endsWith('.png') ? newBase : `${newBase}.png`,
            customName: newBase,
          });
        } else {
          itemMap.set(item.id, item);
        }
      });

      // 2. If custom order was provided via drag or sort, re-align the selected items in that order
      if (orderedIds && orderedIds.length > 0) {
        const orderedSelectedItems = orderedIds
          .map((id) => itemMap.get(id))
          .filter(Boolean) as ImageItem[];

        let selIdx = 0;
        return prev.map((item) => {
          if (selectedItemIds.has(item.id) && selIdx < orderedSelectedItems.length) {
            return orderedSelectedItems[selIdx++];
          }
          return itemMap.get(item.id) || item;
        });
      }

      return prev.map((item) => itemMap.get(item.id) || item);
    });
    showToast(`已成功按顺序批量重命名 ${selectedItemIds.size} 项图片`, 'success');
  };

  // Reorder items completely (e.g. from sort view or drag)
  const handleReorderItems = (newOrderedItems: ImageItem[]) => {
    setItems(newOrderedItems);
    showToast('已更新列表队列顺序', 'info');
  };

  // Move single item to precise 1-based position
  const handleMoveItemToPosition = (id: string, targetPosition1Based: number) => {
    setItems((prev) => {
      const sourceIndex = prev.findIndex((i) => i.id === id);
      if (sourceIndex === -1) return prev;
      const targetIndex = Math.max(0, Math.min(prev.length - 1, targetPosition1Based - 1));
      if (sourceIndex === targetIndex) return prev;

      const copy = [...prev];
      const [moved] = copy.splice(sourceIndex, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
    showToast(`已将图片精准移动至第 ${targetPosition1Based} 位`, 'success');
  };

  // Move single item up or down in list
  const handleMoveItem = (id: string, direction: 'up' | 'down') => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return prev;
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === prev.length - 1) return prev;

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      const copy = [...prev];
      const [removed] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, removed);
      return copy;
    });
  };

  // Reset custom names to original file names
  const handleResetNames = (selectedItemIds: Set<string>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (!selectedItemIds.has(item.id)) return item;
        return {
          ...item,
          name: item.file.name,
          customName: undefined,
        };
      })
    );
    showToast(`已将选中的 ${selectedItemIds.size} 项恢复为原始文件名`, 'info');
  };

  // Single item inline rename
  const handleRenameSingle = (id: string, newName: string) => {
    if (!newName.trim()) return;
    const cleanBase = newName.replace(/\.[^/.]+$/, '').trim();
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              name: `${cleanBase}.png`,
              customName: cleanBase,
            }
          : item
      )
    );
    showToast(`文件名已修改`, 'info');
  };

  // Select local output directory using File System Access API
  const handleSelectDirectory = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        // @ts-ignore
        const handle = await window.showDirectoryPicker({
          mode: 'readwrite',
        });
        setDirConfig({
          mode: 'directory',
          directoryHandle: handle,
          directoryName: handle.name,
        });
        showToast(`已绑定输出目录: ${handle.name}`, 'success');
      } else {
        showToast('当前浏览器环境不支持文件夹直接写入，已切换为 ZIP 打包下载模式', 'info');
        setDirConfig((prev) => ({ ...prev, mode: 'zip' }));
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        showToast(`选择目录失败: ${err.message || '权限不足'}`, 'error');
      }
    }
  };

  // Download a single JPG
  const handleDownloadSingle = (item: ImageItem) => {
    if (!item.convertedBlob) return;
    const itemIdx = items.findIndex((i) => i.id === item.id);
    const outputName = getOutputFilename(item.name, config, itemIdx !== -1 ? itemIdx + 1 : 1);
    const link = document.createElement('a');
    link.href = item.convertedUrl || URL.createObjectURL(item.convertedBlob);
    link.download = outputName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`已下载 ${outputName}`, 'success');
  };

  // Export any list of items (used for Export All or Export Selected)
  const exportItemsList = async (targetItems: ImageItem[]) => {
    const doneItems = targetItems.filter((i) => i.status === 'done' && i.convertedBlob);
    if (doneItems.length === 0) {
      showToast('暂无已完成的 JPG 文件可导出', 'info');
      return;
    }

    // Mode 1: Direct writing to selected directory handle
    if (dirConfig.directoryHandle) {
      try {
        let savedCount = 0;
        for (const item of doneItems) {
          const itemIdx = items.findIndex((i) => i.id === item.id);
          const filename = getOutputFilename(item.name, config, itemIdx !== -1 ? itemIdx + 1 : 1);
          // @ts-ignore
          const fileHandle = await dirConfig.directoryHandle.getFileHandle(filename, {
            create: true,
          });
          // @ts-ignore
          const writable = await fileHandle.createWritable();
          await writable.write(item.convertedBlob);
          await writable.close();
          savedCount++;
        }
        showToast(`成功将 ${savedCount} 张 JPG 写入本地目录: ${dirConfig.directoryName}`, 'success');
        return;
      } catch (err: any) {
        showToast(`写入本地目录失败: ${err.message}，正在尝试 ZIP 打包下载...`, 'error');
      }
    }

    // Mode 2: ZIP Archive Download
    if (dirConfig.mode === 'zip' || !dirConfig.directoryHandle) {
      try {
        const zip = new JSZip();
        for (const item of doneItems) {
          if (item.convertedBlob) {
            const itemIdx = items.findIndex((i) => i.id === item.id);
            const filename = getOutputFilename(item.name, config, itemIdx !== -1 ? itemIdx + 1 : 1);
            zip.file(filename, item.convertedBlob);
          }
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `JPG_Converted_Batch_${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast(`已打包下载 ${doneItems.length} 张 JPG (ZIP 格式)`, 'success');
      } catch (err: any) {
        showToast(`打包失败: ${err.message}`, 'error');
      }
      return;
    }

    // Mode 3: Browser individual downloads
    for (const item of doneItems) {
      handleDownloadSingle(item);
    }
  };

  // Save all completed JPGs
  const handleSaveAll = async () => {
    await exportItemsList(items);
  };

  // Sample generator
  const handleGenerateSamples = async () => {
    const sampleFiles = await createSamplePngFiles();
    handleFilesSelected(sampleFiles);
  };

  // Global Clipboard Paste Listener (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const rawFiles = Array.from(e.clipboardData.files) as File[];
        const imageFiles = rawFiles.filter(
          (f) => f.type.startsWith('image/') || f.name.toLowerCase().endsWith('.png')
        );
        if (imageFiles.length > 0) {
          e.preventDefault();
          handleFilesSelected(imageFiles);
          showToast(`已从剪贴板粘贴导入 ${imageFiles.length} 张图片`, 'success');
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [config]);

  // Global Window Drag and Drop overlay & tracking
  useEffect(() => {
    const handleWindowDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files')) {
        dragCounterRef.current += 1;
        setIsGlobalDragOver(true);
      }
    };

    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      if (!isGlobalDragOver && e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files')) {
        setIsGlobalDragOver(true);
      }
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current -= 1;
      if (
        dragCounterRef.current <= 0 ||
        e.clientX <= 0 ||
        e.clientY <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY >= window.innerHeight ||
        !e.relatedTarget
      ) {
        dragCounterRef.current = 0;
        setIsGlobalDragOver(false);
      }
    };

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsGlobalDragOver(false);

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const rawFiles = Array.from(e.dataTransfer.files) as File[];
        const pngFiles = rawFiles.filter(
          (f) => f.type === 'image/png' || f.name.toLowerCase().endsWith('.png')
        );
        if (pngFiles.length > 0 && handleFilesSelectedRef.current) {
          handleFilesSelectedRef.current(pngFiles);
        }
      }
    };

    const resetDrag = () => {
      dragCounterRef.current = 0;
      setIsGlobalDragOver(false);
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('drop', handleWindowDrop);
    window.addEventListener('dragend', resetDrag);
    window.addEventListener('blur', resetDrag);
    document.addEventListener('mouseleave', resetDrag);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('drop', handleWindowDrop);
      window.removeEventListener('dragend', resetDrag);
      window.removeEventListener('blur', resetDrag);
      document.removeEventListener('mouseleave', resetDrag);
    };
  }, []);

  // Keyboard Shortcuts Listener (Ctrl+O, Ctrl+S, Ctrl+Delete, Ctrl+Enter, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInputActive = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

      // 1. Ctrl + O: Open file picker
      if (isCmdOrCtrl && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        hiddenFileInputRef.current?.click();
        return;
      }

      // 2. Ctrl + S: Save / Export all
      if (isCmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveAll();
        return;
      }

      // 3. Ctrl + Delete: Clear all
      if (isCmdOrCtrl && (e.key === 'Delete' || e.key === 'Backspace') && !isInputActive) {
        e.preventDefault();
        if (items.length > 0) {
          handleClearAll();
        }
        return;
      }

      // 4. Ctrl + Enter: Start converting pending
      if (isCmdOrCtrl && e.key === 'Enter') {
        e.preventDefault();
        handleStartAll();
        return;
      }

      // 5. Esc: Close modals
      if (e.key === 'Escape') {
        if (activeCompareItem) setActiveCompareItem(null);
        if (showShortcutsModal) setShowShortcutsModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [items, config, dirConfig, activeCompareItem, showShortcutsModal]);

  const sampleFileName = items.length > 0 ? items[0].name : 'sample_photo.png';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Global Drag and Drop Overlay */}
      {isGlobalDragOver && (
        <div
          id="global-drag-overlay"
          className="fixed inset-0 z-50 bg-amber-500/20 backdrop-blur-md border-4 border-dashed border-amber-400 flex flex-col items-center justify-center pointer-events-none select-none animate-in fade-in"
        >
          <div className="bg-slate-900/90 border border-amber-500/40 px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-3">
            <Upload className="w-12 h-12 text-amber-400 animate-bounce" />
            <h2 className="text-xl font-bold text-white">松开鼠标立即导入 PNG 图片</h2>
            <p className="text-xs text-slate-400">将自动加入批量转换工作台队列</p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        accept=".png,image/png"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            const rawFiles = Array.from(e.target.files) as File[];
            const files = rawFiles.filter(
              (f) => f.type === 'image/png' || f.name.toLowerCase().endsWith('.png')
            );
            handleFilesSelected(files);
            e.target.value = '';
          }
        }}
      />

      {/* Header */}
      <WorkbenchHeader
        items={items}
        isProcessing={isProcessing}
        onStartAll={handleStartAll}
        onSaveAll={handleSaveAll}
        onClearAll={handleClearAll}
        onReconvertAll={handleReconvertAll}
        onOpenFileInput={() => hiddenFileInputRef.current?.click()}
      />

      {/* Output Settings Toolbar */}
      <ConversionSettingsBar
        config={config}
        onChangeConfig={handleConfigChange}
        dirConfig={dirConfig}
        onChangeDirConfig={handleDirConfigChange}
        onSelectDirectory={handleSelectDirectory}
        isProcessing={isProcessing}
        sampleFileName={sampleFileName}
        onShowShortcuts={() => setShowShortcutsModal(true)}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-5">
        {/* If items are empty, show main hero dropzone */}
        {items.length === 0 ? (
          <div className="my-auto py-8">
            <DropZone
              onFilesSelected={handleFilesSelected}
              onGenerateSampleImages={handleGenerateSamples}
            />
          </div>
        ) : (
          <>
            {/* Progress status card */}
            <ProgressBar
              items={items}
              isProcessing={isProcessing}
              dirConfig={dirConfig}
              onStartConvertAll={handleStartAll}
              onExportAll={handleSaveAll}
            />

            {/* Workbench Table */}
            <ImageTable
              items={items}
              config={config}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
              onSelectOnlyDone={handleSelectOnlyDone}
              onClearSelection={handleClearSelection}
              onBatchDownloadSelected={handleBatchDownloadSelected}
              onBatchReconvertSelected={handleBatchReconvertSelected}
              onBatchRemoveSelected={handleBatchRemoveSelected}
              onBulkRename={handleBulkRename}
              onResetNames={handleResetNames}
              onRenameSingle={handleRenameSingle}
              onReorderItems={handleReorderItems}
              onMoveItem={handleMoveItem}
              onMoveItemToPosition={handleMoveItemToPosition}
              onConvertSingle={handleConvertSingle}
              onRemoveItem={handleRemoveItem}
              onPreviewCompare={(item) => setActiveCompareItem(item)}
              onDownloadSingle={handleDownloadSingle}
              isProcessing={isProcessing}
            />

            {/* Compact Drop Zone below table to add more files easily */}
            <DropZone
              isCompact
              onFilesSelected={handleFilesSelected}
            />
          </>
        )}
      </main>

      {/* Compare Modal */}
      {activeCompareItem && (
        <CompareModal
          item={activeCompareItem}
          itemIndex={
            items.findIndex((i) => i.id === activeCompareItem.id) !== -1
              ? items.findIndex((i) => i.id === activeCompareItem.id) + 1
              : 1
          }
          config={config}
          onClose={() => setActiveCompareItem(null)}
          onDownload={handleDownloadSingle}
        />
      )}

      {/* Keyboard Shortcuts Guide Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          id="system-toast"
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-medium border transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-700 shadow-emerald-950/50'
              : toast.type === 'error'
              ? 'bg-red-950 text-red-200 border-red-700 shadow-red-950/50'
              : 'bg-slate-900 text-slate-200 border-slate-700 shadow-slate-950/50'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-amber-400 shrink-0" />}
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}

export default App;
