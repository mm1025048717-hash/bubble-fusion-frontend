import React from 'react';
import { Plus, Trash2, Edit3, Shuffle, Save, Search, Eye, EyeOff, History } from 'lucide-react';

export function LeftToolbar({ 
  onAdd, 
  onShuffle, 
  onDeleteSelected, 
  onSaveLayout,
  onSearch,
  showHistory,
  onToggleHistory,
  performanceMode,
  onTogglePerformance
}) {
  const btn = 'w-10 h-10 flex items-center justify-center rounded-xl border border-bfl-border bg-white hover:bg-bfl-surface-2';
  const icon = 'w-5 h-5 text-bfl-text-dim';
  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 p-2 bg-white/70 backdrop-blur rounded-2xl border border-bfl-border shadow-sm">
      <button className={btn} title="添加气泡" onClick={onAdd}><Plus className={icon} /></button>
      <button className={btn} title="搜索气泡" onClick={() => {
        const q = prompt('搜索气泡关键词:');
        if (q && q.trim()) onSearch?.(q.trim());
      }}><Search className={icon} /></button>
      <button className={btn} title="随机打散位置" onClick={onShuffle}><Shuffle className={icon} /></button>
      <div className="w-10 h-px bg-bfl-border mx-auto" />
      <button className={btn} title="删除选中" onClick={onDeleteSelected}><Trash2 className={icon} /></button>
      <button className={btn} title="保存布局" onClick={onSaveLayout}><Save className={icon} /></button>
      <div className="w-10 h-px bg-bfl-border mx-auto" />
      <button className={`${btn} ${showHistory ? 'bg-bfl-surface-2' : ''}`} title={showHistory ? '隐藏历史' : '显示历史'} onClick={onToggleHistory}>
        <History className={icon} />
      </button>
      <button className={btn} title={performanceMode ? '关闭低配模式' : '开启低配模式'} onClick={onTogglePerformance}>
        {performanceMode ? <EyeOff className={icon} /> : <Eye className={icon} />}
      </button>
    </div>
  );
}


