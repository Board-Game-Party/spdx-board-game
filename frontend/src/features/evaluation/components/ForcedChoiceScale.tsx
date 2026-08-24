import React from 'react';
import { cn } from '../../../lib/utils';

export interface ForcedChoiceScaleProps {
  pairAssignmentId: string;
  leftItemName: string;
  rightItemName: string;
  value: number | null;
  onChange: (val: number) => void;
  disabled?: boolean;
}

const SCALE_OPTIONS = [
  { value: 1, label: 'ซ้ายดีกว่ามาก (A>>)', short: '1 ซ้ายดีกว่ามาก', side: 'left', strong: true },
  { value: 2, label: 'ซ้ายดีกว่า (A>)', short: '2 ซ้ายดีกว่า', side: 'left', strong: false },
  { value: 3, label: 'ซ้ายดีกว่าเล็กน้อย (A+)', short: '3 ซ้ายดีกว่าเล็กน้อย', side: 'left', strong: false },
  { value: 4, label: 'ขวาดีกว่าเล็กน้อย (B+)', short: '4 ขวาดีกว่าเล็กน้อย', side: 'right', strong: false },
  { value: 5, label: 'ขวาดีกว่า (B>)', short: '5 ขวาดีกว่า', side: 'right', strong: false },
  { value: 6, label: 'ขวาดีกว่ามาก (B>>)', short: '6 ขวาดีกว่ามาก', side: 'right', strong: true },
];

export const ForcedChoiceScale: React.FC<ForcedChoiceScaleProps> = ({
  pairAssignmentId,
  leftItemName,
  rightItemName,
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-4 pt-2">
      {/* 6-point visual scale (D1: No middle choice) */}
      <fieldset
        className="space-y-3"
        role="radiogroup"
        aria-label={`เปรียบเทียบระหว่าง ${leftItemName} และ ${rightItemName}`}
      >
        <div className="flex justify-between text-xs font-bold text-slate-700 px-1">
          <span className="text-brand-700">&larr; {leftItemName} ดีกว่า</span>
          <span className="text-purple-700">{rightItemName} ดีกว่า &rarr;</span>
        </div>

        {/* Radio option grid */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          {SCALE_OPTIONS.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <label
                key={opt.value}
                className={cn(
                  'relative flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all text-center select-none',
                  disabled && 'opacity-60 cursor-not-allowed',
                  isSelected
                    ? opt.side === 'left'
                      ? 'bg-brand-500 text-white border-brand-600 shadow-md ring-2 ring-brand-400 ring-offset-1'
                      : 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-400 ring-offset-1'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                )}
              >
                <input
                  type="radio"
                  name={`pair-${pairAssignmentId}`}
                  value={opt.value}
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() => onChange(opt.value)}
                  className="sr-only"
                  aria-label={opt.label}
                />
                <span className="text-base font-bold mb-0.5">{opt.value}</span>
                <span className="text-[10px] leading-tight opacity-90">{opt.short.replace(/^\d\s*/, '')}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
};
