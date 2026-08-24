import React from 'react';
import { Check, Loader2, CloudOff } from 'lucide-react';

export interface AutosaveBadgeProps {
  status: 'idle' | 'saving' | 'saved' | 'offline';
  lastSavedTime?: string;
}

export const AutosaveBadge: React.FC<AutosaveBadgeProps> = ({ status, lastSavedTime }) => {
  return (
    <div
      aria-live="polite"
      className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full"
    >
      {status === 'saving' && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
          <span>กำลังบันทึกฉบับร่าง...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-600" />
          <span>บันทึกแล้ว {lastSavedTime ? `เมื่อ ${lastSavedTime}` : ''}</span>
        </>
      )}
      {status === 'offline' && (
        <>
          <CloudOff className="h-3.5 w-3.5 text-amber-600" />
          <span>เน็ตหลุด: บันทึกลง Local Queue</span>
        </>
      )}
      {status === 'idle' && <span>บันทึกฉบับร่างอัตโนมัติ</span>}
    </div>
  );
};
