import React, { useState } from 'react';
import {
  Folder,
  FolderCheck,
  Sliders,
  Palette,
  Zap,
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkPlus,
  Trash2,
  Eye,
  Keyboard,
  Calendar,
  Clock,
  Hash,
  Sparkles,
  Layers,
  X,
  FileCode,
  Tag,
  Settings2,
} from 'lucide-react';
import { ConversionConfig, DirectoryConfig, ConfigPreset } from '../types';
import { getOutputFilename } from '../utils/imageConverter';

const DEFAULT_PRESETS: ConfigPreset[] = [
  {
    id: 'preset-lossless-white',
    name: '100%无损 · 白底 (默认)',
    isBuiltin: true,
    config: {
      quality: 1.0,
      backgroundColor: '#FFFFFF',
      extension: 'jpg',
      namePrefix: '',
      nameSuffix: '',
      autoStart: true,
    },
  },
  {
    id: 'preset-lossless-dark',
    name: '100%无损 · 黑底',
    isBuiltin: true,
    config: {
      quality: 1.0,
      backgroundColor: '#000000',
      extension: 'jpg',
      namePrefix: '',
      nameSuffix: '',
      autoStart: true,
    },
  },
  {
    id: 'preset-numbered-archive',
    name: '三位序号归档 ({index:3}_原名)',
    isBuiltin: true,
    config: {
      quality: 1.0,
      backgroundColor: '#FFFFFF',
      extension: 'jpg',
      namePrefix: '{index:3}_',
      nameSuffix: '',
      autoStart: true,
    },
  },
  {
    id: 'preset-dated-backup',
    name: '日期时间戳后缀 (原名_{timestamp})',
    isBuiltin: true,
    config: {
      quality: 1.0,
      backgroundColor: '#FFFFFF',
      extension: 'jpg',
      namePrefix: '',
      nameSuffix: '_{timestamp}',
      autoStart: true,
    },
  },
  {
    id: 'preset-web-compact',
    name: '高压缩率 · 85% Web优化',
    isBuiltin: true,
    config: {
      quality: 0.85,
      backgroundColor: '#FFFFFF',
      extension: 'jpg',
      namePrefix: '',
      nameSuffix: '_web',
      autoStart: true,
    },
  },
];

const PRESETS_STORAGE_KEY = 'png2jpg_converter_presets_v3';

const DYNAMIC_VARIABLES = [
  {
    token: '{index}',
    label: '自增序号',
    sample: '1, 2, 3...',
    desc: '从 1 开始自动递增序号',
    icon: Hash,
  },
  {
    token: '{index:2}',
    label: '两位序号',
    sample: '01, 02, 03...',
    desc: '两位数自动补零序号',
    icon: Hash,
  },
  {
    token: '{index:3}',
    label: '三位序号',
    sample: '001, 002, 003...',
    desc: '三位数补零，适合大批量排序',
    icon: Hash,
  },
  {
    token: '{timestamp}',
    label: '紧凑时间戳',
    sample: '20260824_104000',
    desc: '精确到年月日_时分秒',
    icon: Clock,
  },
  {
    token: '{date}',
    label: '当前日期',
    sample: '2026-08-24',
    desc: '标准 YYYY-MM-DD 日期',
    icon: Calendar,
  },
  {
    token: '{time}',
    label: '当前时间',
    sample: '10-40-00',
    desc: '标准 HH-mm-ss 时间',
    icon: Clock,
  },
  {
    token: '{name}',
    label: '原文件名',
    sample: 'avatar',
    desc: '不含后缀的原始文件名',
    icon: FileCode,
  },
];

const QUICK_NAMING_TEMPLATES = [
  { name: '保持原名', prefix: '', suffix: '', desc: '原名.jpg' },
  { name: '三位序号前缀', prefix: '{index:3}_', suffix: '', desc: '001_原名.jpg' },
  { name: '序号后缀', prefix: '', suffix: '_{index}', desc: '原名_1.jpg' },
  { name: '日期前缀', prefix: '{date}_', suffix: '', desc: '2026-08-24_原名.jpg' },
  { name: '时间戳后缀', prefix: '', suffix: '_{timestamp}', desc: '原名_20260824_104000.jpg' },
  { name: '高清后缀', prefix: '', suffix: '_hd', desc: '原名_hd.jpg' },
];

interface ConversionSettingsBarProps {
  config: ConversionConfig;
  onChangeConfig: (newConfig: Partial<ConversionConfig>) => void;
  dirConfig: DirectoryConfig;
  onChangeDirConfig: (newDirConfig: Partial<DirectoryConfig>) => void;
  onSelectDirectory: () => Promise<void>;
  isProcessing: boolean;
  sampleFileName?: string;
  onShowShortcuts?: () => void;
}

export const ConversionSettingsBar: React.FC<ConversionSettingsBarProps> = ({
  config,
  onChangeConfig,
  dirConfig,
  onChangeDirConfig,
  onSelectDirectory,
  isProcessing,
  sampleFileName = 'sample_photo.png',
  onShowShortcuts,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [previewIndex, setPreviewIndex] = useState<number>(1);
  const [activeInsertTarget, setActiveInsertTarget] = useState<'prefix' | 'suffix'>('suffix');
  const [showTokenMenu, setShowTokenMenu] = useState(false);

  const [presets, setPresets] = useState<ConfigPreset[]>(() => {
    try {
      const saved = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load presets from localStorage', e);
    }
    return DEFAULT_PRESETS;
  });

  const isFileSystemSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  const bgPresets = [
    { label: '纯白底', color: '#FFFFFF', border: 'border-slate-400' },
    { label: '纯黑底', color: '#000000', border: 'border-slate-700' },
    { label: '浅灰底', color: '#F1F5F9', border: 'border-slate-400' },
  ];

  // Save presets
  const persistPresets = (newPresetsList: ConfigPreset[]) => {
    setPresets(newPresetsList);
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(newPresetsList));
    } catch (e) {
      console.error(e);
    }
  };

  // Save current config as preset
  const handleSaveCurrentAsPreset = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPresetName.trim();
    if (!name) return;

    const newPreset: ConfigPreset = {
      id: `custom-preset-${Date.now()}`,
      name,
      isBuiltin: false,
      config: { ...config },
    };

    const updated = [...presets, newPreset];
    persistPresets(updated);
    setNewPresetName('');
    setShowPresetModal(false);
  };

  // Delete custom preset
  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = presets.filter((p) => p.id !== id);
    persistPresets(updated);
  };

  // Apply preset
  const handleSelectPreset = (preset: ConfigPreset) => {
    onChangeConfig({ ...preset.config });
  };

  // Insert dynamic token
  const handleInsertToken = (token: string, target: 'prefix' | 'suffix') => {
    if (target === 'prefix') {
      onChangeConfig({ namePrefix: `${config.namePrefix}${token}` });
    } else {
      onChangeConfig({ nameSuffix: `${config.nameSuffix}${token}` });
    }
    setShowTokenMenu(false);
  };

  // Apply quick naming template
  const handleApplyTemplate = (template: { prefix: string; suffix: string }) => {
    onChangeConfig({
      namePrefix: template.prefix,
      nameSuffix: template.suffix,
    });
  };

  const simulatedOutputName = getOutputFilename(sampleFileName, config, previewIndex);

  const hasDynamicTokens =
    /\{(index(:\d+)?|date|time|timestamp|name)\}/i.test(config.namePrefix) ||
    /\{(index(:\d+)?|date|time|timestamp|name)\}/i.test(config.nameSuffix);

  return (
    <section
      id="conversion-settings-panel"
      className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-800/90 text-slate-200 text-xs py-2.5 px-4 sm:px-6 lg:px-8 shadow-sm transition-all"
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-2.5">
        {/* Main Settings Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 lg:gap-4">
          {/* Group 1: Output Destination & Presets */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Output Destination */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                导出目标:
              </span>

              {isFileSystemSupported ? (
                <div className="flex items-center gap-1.5">
                  <button
                    id="btn-select-directory"
                    onClick={onSelectDirectory}
                    disabled={isProcessing}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                      dirConfig.directoryHandle
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                    }`}
                    title="选择本地文件夹，转换后的 JPG 将直接写入该目录"
                  >
                    {dirConfig.directoryHandle ? (
                      <>
                        <FolderCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-semibold max-w-[130px] truncate">
                          {dirConfig.directoryName || '本地目录'}
                        </span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                          已绑定
                        </span>
                      </>
                    ) : (
                      <>
                        <Folder className="w-3.5 h-3.5 text-slate-400" />
                        <span>选择本地目录...</span>
                      </>
                    )}
                  </button>

                  {dirConfig.directoryHandle && (
                    <button
                      onClick={() =>
                        onChangeDirConfig({
                          directoryHandle: null,
                          directoryName: undefined,
                          mode: 'zip',
                        })
                      }
                      className="text-[11px] text-slate-400 hover:text-amber-400 underline cursor-pointer px-1"
                      title="重置为 ZIP 打包下载"
                    >
                      切换为打包
                    </button>
                  )}
                </div>
              ) : null}

              {(!dirConfig.directoryHandle || !isFileSystemSupported) && (
                <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
                  <button
                    onClick={() => onChangeDirConfig({ mode: 'zip' })}
                    className={`px-2.5 py-0.5 rounded-md transition font-medium cursor-pointer ${
                      dirConfig.mode === 'zip'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ZIP 打包
                  </button>
                  <button
                    onClick={() => onChangeDirConfig({ mode: 'download' })}
                    className={`px-2.5 py-0.5 rounded-md transition font-medium cursor-pointer ${
                      dirConfig.mode === 'download'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    逐张下载
                  </button>
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="hidden sm:block h-3.5 w-px bg-slate-800" />

            {/* Presets Switcher */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                预设:
              </span>

              <select
                id="select-config-preset"
                onChange={(e) => {
                  const p = presets.find((item) => item.id === e.target.value);
                  if (p) handleSelectPreset(p);
                }}
                value={
                  presets.find(
                    (p) =>
                      p.config.quality === config.quality &&
                      p.config.backgroundColor.toUpperCase() === config.backgroundColor.toUpperCase() &&
                      p.config.extension === config.extension &&
                      p.config.namePrefix === config.namePrefix &&
                      p.config.nameSuffix === config.nameSuffix
                  )?.id || ''
                }
                className="bg-slate-800 text-slate-100 text-xs px-2.5 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer font-medium max-w-[140px] sm:max-w-[170px] truncate"
              >
                <option value="" disabled>
                  -- 快捷选择预设 --
                </option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <button
                id="btn-save-as-preset"
                onClick={() => setShowPresetModal(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-slate-800 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30 border border-slate-700 transition cursor-pointer"
                title="将当前画质、底色、命名规则存为预设"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">存预设</span>
              </button>
            </div>
          </div>

          {/* Group 2: Quality, Background, Auto Convert, Naming Drawer */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* JPG Quality */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700/80">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300 font-medium whitespace-nowrap">画质:</span>
              <span className="font-bold text-amber-400 w-8 text-right font-mono">
                {Math.round(config.quality * 100)}%
              </span>
              <input
                id="input-quality-range"
                type="range"
                min="0.5"
                max="1.0"
                step="0.01"
                value={config.quality}
                onChange={(e) => onChangeConfig({ quality: parseFloat(e.target.value) })}
                className="w-14 sm:w-18 accent-amber-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                title="100% 为全无损画质，保留原始颜色与细节"
              />
              {config.quality >= 0.98 && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded border border-emerald-500/30 font-medium">
                  无损
                </span>
              )}
            </div>

            {/* Transparent Alpha Background Fill */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700/80">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300 font-medium whitespace-nowrap">透明底色:</span>
              <div className="flex items-center gap-1">
                {bgPresets.map((preset) => (
                  <button
                    key={preset.color}
                    onClick={() => onChangeConfig({ backgroundColor: preset.color })}
                    className={`w-3.5 h-3.5 rounded-full border transition cursor-pointer ${preset.border} ${
                      config.backgroundColor.toUpperCase() === preset.color.toUpperCase()
                        ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-900 scale-110'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: preset.color }}
                    title={`透明像素填充为${preset.label} (${preset.color})`}
                  />
                ))}
                <input
                  type="color"
                  value={config.backgroundColor}
                  onChange={(e) => onChangeConfig({ backgroundColor: e.target.value })}
                  className="w-3.5 h-3.5 rounded cursor-pointer bg-transparent border-0 p-0"
                  title="自定义透明填充颜色"
                />
              </div>
            </div>

            {/* Auto Start */}
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/70">
              <input
                id="checkbox-auto-convert"
                type="checkbox"
                checked={config.autoStart}
                onChange={(e) => onChangeConfig({ autoStart: e.target.checked })}
                className="w-3.5 h-3.5 rounded accent-amber-500 cursor-pointer"
              />
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">导入即转</span>
            </label>

            {/* Shortcuts */}
            {onShowShortcuts && (
              <button
                onClick={onShowShortcuts}
                className="text-slate-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/70"
                title="键盘快捷键 (Ctrl+O, Ctrl+S, Ctrl+Enter...)"
              >
                <Keyboard className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">快捷键</span>
              </button>
            )}

            {/* Smart Naming Drawer Toggle */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition cursor-pointer font-medium ${
                isExpanded || hasDynamicTokens || config.namePrefix || config.nameSuffix
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              <span>智能命名与变量</span>
              {hasDynamicTokens && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Drawer for Advanced Naming */}
        {isExpanded && (
          <div
            id="naming-rules-expanded-panel"
            className="pt-2.5 mt-0.5 border-t border-slate-800/90 flex flex-col gap-2.5 animate-in fade-in duration-150"
          >
            {/* Quick Templates & Dynamic Token Insertion */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/70 p-2 rounded-xl border border-slate-800/90">
              {/* Quick Preset Templates */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  常用模版:
                </span>
                {QUICK_NAMING_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.name}
                    onClick={() => handleApplyTemplate(tmpl)}
                    className={`text-[11px] px-2 py-0.5 rounded-md border transition cursor-pointer ${
                      config.namePrefix === tmpl.prefix && config.nameSuffix === tmpl.suffix
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                    }`}
                    title={tmpl.desc}
                  >
                    {tmpl.name}
                  </button>
                ))}
              </div>

              {/* Dynamic Tokens Insertion Group */}
              <div className="relative flex items-center gap-2">
                <span className="text-[11px] text-slate-400">插入到:</span>
                <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700 text-xs">
                  <button
                    onClick={() => setActiveInsertTarget('prefix')}
                    className={`px-2 py-0.5 rounded-md font-medium cursor-pointer ${
                      activeInsertTarget === 'prefix'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    前缀
                  </button>
                  <button
                    onClick={() => setActiveInsertTarget('suffix')}
                    className={`px-2 py-0.5 rounded-md font-medium cursor-pointer ${
                      activeInsertTarget === 'suffix'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    后缀
                  </button>
                </div>

                {/* Dropdown Menu Trigger */}
                <div className="relative">
                  <button
                    onClick={() => setShowTokenMenu(!showTokenMenu)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-sm transition cursor-pointer"
                  >
                    <span>＋ 插入动态变量</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Dropdown menu */}
                  {showTokenMenu && (
                    <div
                      className="absolute right-0 top-full mt-1.5 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 divide-y divide-slate-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-3 py-1 text-[11px] text-slate-400 font-semibold">
                        点击选择要插入到【{activeInsertTarget === 'prefix' ? '前缀' : '后缀'}】的变量：
                      </div>
                      <div className="py-1">
                        {DYNAMIC_VARIABLES.map((v) => {
                          const IconComp = v.icon;
                          return (
                            <button
                              key={v.token}
                              onClick={() => handleInsertToken(v.token, activeInsertTarget)}
                              className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-slate-800 text-slate-200 hover:text-amber-300 transition cursor-pointer group"
                            >
                              <div className="flex items-center gap-2">
                                <IconComp className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition" />
                                <div>
                                  <span className="font-medium">{v.label}</span>
                                  <span className="ml-1.5 font-mono text-[11px] text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">
                                    {v.token}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">{v.sample}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Input Fields Row: Extension, Prefix, Suffix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
              {/* Output Extension */}
              <div className="flex items-center gap-2 bg-slate-950/40 p-2 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 font-semibold whitespace-nowrap">输出扩展名:</span>
                <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                  <button
                    onClick={() => onChangeConfig({ extension: 'jpg' })}
                    className={`px-3 py-0.5 rounded-md font-mono font-medium cursor-pointer ${
                      config.extension === 'jpg'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    .jpg
                  </button>
                  <button
                    onClick={() => onChangeConfig({ extension: 'jpeg' })}
                    className={`px-3 py-0.5 rounded-md font-mono font-medium cursor-pointer ${
                      config.extension === 'jpeg'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    .jpeg
                  </button>
                </div>
              </div>

              {/* Name Prefix Input */}
              <div className="flex items-center gap-2 bg-slate-950/40 p-2 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 font-semibold whitespace-nowrap">前缀:</span>
                <div className="relative w-full flex items-center">
                  <input
                    id="input-name-prefix"
                    type="text"
                    value={config.namePrefix}
                    onChange={(e) => onChangeConfig({ namePrefix: e.target.value })}
                    placeholder="如: {index:3}_ 或 {date}_"
                    className="bg-slate-800 text-slate-100 px-2.5 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500 w-full text-xs font-mono pr-6"
                  />
                  {config.namePrefix && (
                    <button
                      onClick={() => onChangeConfig({ namePrefix: '' })}
                      className="absolute right-1.5 text-slate-400 hover:text-white cursor-pointer"
                      title="清除前缀"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Name Suffix Input */}
              <div className="flex items-center gap-2 bg-slate-950/40 p-2 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 font-semibold whitespace-nowrap">后缀:</span>
                <div className="relative w-full flex items-center">
                  <input
                    id="input-name-suffix"
                    type="text"
                    value={config.nameSuffix}
                    onChange={(e) => onChangeConfig({ nameSuffix: e.target.value })}
                    placeholder="如: _{timestamp} 或 _{index}"
                    className="bg-slate-800 text-slate-100 px-2.5 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500 w-full text-xs font-mono pr-6"
                  />
                  {config.nameSuffix && (
                    <button
                      onClick={() => onChangeConfig({ nameSuffix: '' })}
                      className="absolute right-1.5 text-slate-400 hover:text-white cursor-pointer"
                      title="清除后缀"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Real-time Dynamic Filename Evaluation Preview Card */}
            <div
              id="filename-preview-box"
              className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs shadow-inner"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-300 font-bold flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  实时效果预览:
                </span>

                {/* Original File */}
                <span className="text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                  原名: {sampleFileName}
                </span>

                <span className="text-amber-400 font-bold">➔</span>

                {/* Output Result */}
                <span className="text-amber-300 font-mono font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/30 text-xs">
                  {simulatedOutputName}
                </span>
              </div>

              {/* Sample Index Switcher */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[11px]">测试第 N 项序号:</span>
                <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-[11px] font-mono">
                  {[1, 2, 8, 25].map((idx) => (
                    <button
                      key={idx}
                      onClick={() => setPreviewIndex(idx)}
                      className={`px-1.5 py-0.5 rounded cursor-pointer transition ${
                        previewIndex === idx
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      #{idx}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preset Modal */}
      {showPresetModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowPresetModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-4 text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-white text-base">
                <BookmarkPlus className="w-5 h-5 text-amber-400" />
                <span>保存当前配置为预设 (Preset)</span>
              </div>
              <button
                onClick={() => setShowPresetModal(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {/* Current parameters summary */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex flex-col gap-1.5">
              <div className="font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>当前包含的转换与命名参数:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-400">
                <div>
                  画质: <strong className="text-amber-400">{Math.round(config.quality * 100)}%</strong>
                </div>
                <div className="flex items-center gap-1.5">
                  底色:
                  <span
                    className="w-3.5 h-3.5 rounded-full inline-block border border-slate-600"
                    style={{ backgroundColor: config.backgroundColor }}
                  />
                  <strong className="text-slate-200">{config.backgroundColor}</strong>
                </div>
                <div>
                  格式: <strong className="text-slate-200">.{config.extension}</strong>
                </div>
                <div>
                  前缀:{' '}
                  <strong className="text-slate-200 font-mono">
                    {config.namePrefix || '无'}
                  </strong>
                </div>
                <div className="col-span-2">
                  后缀:{' '}
                  <strong className="text-slate-200 font-mono">
                    {config.nameSuffix || '无'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Name Input Form */}
            <form onSubmit={handleSaveCurrentAsPreset} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  预设名称:
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="例如: 每日归档_白底100%、电商三位序号"
                  className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPresetModal(false)}
                  className="px-3.5 py-1.5 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer shadow-sm"
                >
                  保存预设
                </button>
              </div>
            </form>

            {/* Existing custom presets list */}
            {presets.some((p) => !p.isBuiltin) && (
              <div className="border-t border-slate-800 pt-3">
                <div className="text-xs font-semibold text-slate-400 mb-2">已保存的自定义预设:</div>
                <div className="max-h-36 overflow-y-auto divide-y divide-slate-800/80">
                  {presets
                    .filter((p) => !p.isBuiltin)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="py-1.5 flex items-center justify-between text-xs hover:bg-slate-800/40 px-2 rounded"
                      >
                        <span className="text-slate-200 font-medium truncate">{p.name}</span>
                        <button
                          onClick={(e) => handleDeletePreset(p.id, e)}
                          className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                          title="删除此预设"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
