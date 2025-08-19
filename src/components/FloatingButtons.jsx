import React from 'react';
import { ListChecks, FileText } from 'lucide-react';

export function FloatingButtons({ onToggleScenarios, onToggleReport }) {
  const btn = 'w-9 h-9 flex items-center justify-center rounded-full border border-bfl-border bg-white hover:bg-bfl-surface-2 shadow-sm';
  const icon = 'w-4.5 h-4.5 text-bfl-text-dim';
  return (
    <div className="absolute right-4 top-4 z-30 flex items-center gap-2 pointer-events-auto">
      <button title="交互案例" onClick={onToggleScenarios} className={btn}>
        <ListChecks className={icon} />
      </button>
      <button title="报告生成" onClick={onToggleReport} className={btn}>
        <FileText className={icon} />
      </button>
    </div>
  );
}


