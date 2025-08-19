import React, { useState } from 'react';
import { Plus, Download, Settings, Search, Eye, EyeOff, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 控制栏组件
 */
export function ControlBar({ 
  onAddBubble, 
  onExport,
  onSearch,
  showHistory,
  onToggleHistory,
  performanceMode,
  onTogglePerformance
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const handleAddBubble = () => {
    const text = prompt('请输入气泡内容:');
    if (text && text.trim()) {
      onAddBubble(text.trim());
    }
  };

  return (
    <motion.div 
      className="bg-white/90 backdrop-blur rounded-full px-4 py-2 shadow-sm border border-bfl-border"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={handleAddBubble}
          className="p-2 rounded-full hover:bg-bfl-surface-2 transition-colors group"
          title="添加气泡"
        >
          <Plus className="w-5 h-5 text-gray-400 group-hover:text-white" />
        </button>

        <AnimatePresence>
          {showSearch ? (
            <motion.form
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 200, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              onSubmit={handleSearch}
              className="flex items-center"
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索气泡..."
                className="bg-white border border-bfl-border text-bfl-text px-3 py-1 rounded-full text-sm outline-none focus:ring-2 focus:ring-bfl-primary"
                autoFocus
                onBlur={() => {
                  if (!searchQuery) setShowSearch(false);
                }}
              />
            </motion.form>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 rounded-full hover:bg-bfl-surface-2 transition-colors group"
              title="搜索"
            >
              <Search className="w-5 h-5 text-gray-400 group-hover:text-white" />
            </button>
          )}
        </AnimatePresence>

        <div className="w-px h-6 bg-bfl-border mx-1" />

        <button
          onClick={onToggleHistory}
          className={`p-2 rounded-full transition-colors group ${
            showHistory ? 'bg-bfl-surface-2' : 'hover:bg-bfl-surface-2'
          }`}
          title={showHistory ? '隐藏历史' : '显示历史'}
        >
          <History className={`w-5 h-5 ${
            showHistory ? 'text-bfl-text' : 'text-bfl-text'
          }`} />
        </button>

        <button
          onClick={onExport}
          className="p-2 rounded-full hover:bg-bfl-surface-2 transition-colors group"
          title="导出 JSON"
        >
          <Download className="w-5 h-5 text-gray-400 group-hover:text-white" />
        </button>

        <button
          onClick={onTogglePerformance}
          className="p-2 rounded-full hover:bg-bfl-surface-2 transition-colors group"
          title={performanceMode ? '关闭低配模式' : '开启低配模式'}
        >
          {performanceMode ? (
            <EyeOff className="w-5 h-5 text-orange-400" />
          ) : (
            <Eye className="w-5 h-5 text-gray-400 group-hover:text-white" />
          )}
        </button>
      </div>
    </motion.div>
  );
}
