import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    {
      keys: ['Ctrl', 'O'],
      macKeys: ['⌘', 'O'],
      desc: '导入并选择 PNG 图片文件',
    },
    {
      keys: ['Ctrl', 'S'],
      macKeys: ['⌘', 'S'],
      desc: '保存并批量导出全部已完成的 JPG',
    },
    {
      keys: ['Ctrl', 'Enter'],
      macKeys: ['⌘', '↵'],
      desc: '开始批量转换队列中的未处理图片',
    },
    {
      keys: ['Ctrl', 'Delete'],
      macKeys: ['⌘', '⌫'],
      desc: '一键清空当前工作台列表',
    },
    {
      keys: ['Esc'],
      macKeys: ['Esc'],
      desc: '关闭当前弹窗或对比预览',
    },
  ];

  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.userAgent || '');

  return (
    <div
      id="shortcuts-modal-overlay"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="shortcuts-modal-content"
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5 font-bold text-white text-base">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Keyboard className="w-4 h-4" />
            </div>
            <span>工作台快捷键指南</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          通过键盘快捷键更快速地在桌面工作台中处理批量转换任务：
        </p>

        <div className="divide-y divide-slate-800 bg-slate-950/80 rounded-xl border border-slate-800/90 overflow-hidden">
          {shortcuts.map((s, idx) => {
            const displayKeys = isMac ? s.macKeys : s.keys;
            return (
              <div
                key={idx}
                className="py-2.5 px-4 flex items-center justify-between text-xs hover:bg-slate-900/50"
              >
                <span className="text-slate-300 font-medium">{s.desc}</span>
                <div className="flex items-center gap-1">
                  {displayKeys.map((k, ki) => (
                    <kbd
                      key={ki}
                      className="px-2 py-1 bg-slate-800 text-amber-300 font-mono font-bold text-[11px] rounded border border-slate-700 shadow-sm"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 transition cursor-pointer"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};
