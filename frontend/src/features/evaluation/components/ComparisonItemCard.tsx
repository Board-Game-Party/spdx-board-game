import React from 'react';
import { ExternalLink, Users } from 'lucide-react';

export interface EvaluationItemCardProps {
  name: string;
  artifactUrl?: string | null;
  memberNames?: string[];
  side: 'left' | 'right';
}

export const ComparisonItemCard: React.FC<EvaluationItemCardProps> = ({
  name,
  artifactUrl,
  memberNames = [],
  side,
}) => {
  const isLeft = side === 'left';

  return (
    <div
      className={`p-4 rounded-2xl border transition-all flex-1 ${
        isLeft
          ? 'bg-brand-50/40 border-brand-200'
          : 'bg-purple-50/40 border-purple-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
              isLeft ? 'bg-brand-100 text-brand-800' : 'bg-purple-100 text-purple-800'
            }`}
          >
            {isLeft ? 'ฝั่งซ้าย (Left Item)' : 'ฝั่งขวา (Right Item)'}
          </span>
          <h4 className="text-base font-bold text-slate-900 mt-1">{name}</h4>
        </div>

        {/* Deliverable Link (A5) */}
        {artifactUrl && (
          <a
            href={artifactUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <span>ดูผลงาน</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {memberNames.length > 0 && (
        <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5 pt-2 border-t border-current/10">
          <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate">สมาชิก: {memberNames.join(', ')}</span>
        </div>
      )}
    </div>
  );
};
