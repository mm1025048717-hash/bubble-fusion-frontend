import React, { useEffect, useState } from 'react';
import { Settings, Sun, Moon, Globe, Book, Keyboard, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function TopBar() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <div className="absolute inset-x-0 top-0 z-40 pointer-events-none">
      {/* 左上角品牌 Chip（小体积，不遮挡画布） */}
      <div className="absolute left-3 top-3 pointer-events-auto">
        <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-white/80 dark:bg-[#0b1220]/80 border border-bfl-border backdrop-blur shadow-sm select-none">
          <img src="/bubble-icon.svg" alt="logo" className="w-5 h-5 rounded" />
          <div className="text-sm font-semibold text-bfl-text dark:text-white">Innofusion</div>
        </div>
      </div>

      {/* 右下角设置按钮（小图标） */}
      <div className="absolute right-3 bottom-3 pointer-events-auto z-40">
        <div className="relative">
          <button onClick={() => setOpen(v=>!v)} className="w-9 h-9 rounded-xl border border-bfl-border bg-white dark:bg-[#0b1220] hover:bg-bfl-surface-2 flex items-center justify-center shadow-sm">
            <Settings className="w-5 h-5 text-bfl-text dark:text-white" />
          </button>
          <AnimatePresence>
            {open && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-[#0b1220] border border-bfl-border shadow-xl p-3">
                <div className="text-xs font-semibold text-bfl-text dark:text-white mb-2">系统设置</div>
                <div className="space-y-1">
                  <button onClick={() => setTheme('light')} className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-bfl-surface-2 ${theme==='light'?'ring-1 ring-bfl-border':''}`}>
                    <Sun className="w-4 h-4" /> 浅色模式
                  </button>
                  <button onClick={() => setTheme('dark')} className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-bfl-surface-2 ${theme==='dark'?'ring-1 ring-bfl-border':''}`}>
                    <Moon className="w-4 h-4" /> 深色模式
                  </button>
                  <div className="h-px bg-bfl-border my-1" />
                  <button className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-bfl-surface-2"><Globe className="w-4 h-4" /> 界面语言</button>
                  <button className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-bfl-surface-2"><MessageSquare className="w-4 h-4" /> 回复语言</button>
                  <div className="h-px bg-bfl-border my-1" />
                  <button className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-bfl-surface-2"><Book className="w-4 h-4" /> 用户手册</button>
                  <button className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-bfl-surface-2"><Keyboard className="w-4 h-4" /> 键盘快捷键</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}


