import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import { Button } from '../../components/Button';
import { Alert } from '../../components/Alert';
import { formatNumber } from '../../lib/utils';
import { ArrowLeft, Download, Edit3 } from 'lucide-react';
import { ScoreOverrideModal } from '../audit/ScoreOverrideModal';

interface CriterionScore {
  criterion_id: string;
  criterion_name: string;
  weight_pct: number;
  comparison_count: number;
  quality_index: number;
  score_ratio: number;
  weighted_score: number;
  flags: string[];
}

interface GroupScoreSummary {
  group_id: string;
  group_name: string;
  component_score: number;
  max_score: number;
  comparison_count: number;
  flags: string[];
  criteria_breakdown: CriterionScore[];
  is_overridden: boolean;
  override_score?: number;
  override_reason?: string;
}

interface GroupReportResponse {
  assignment_id: string;
  assignment_name: string;
  status: string;
  group_max_score: number;
  groups: GroupScoreSummary[];
}

export interface GroupReportViewProps {
  assignmentId: string;
  onBack: () => void;
}

export const GroupReportView: React.FC<GroupReportViewProps> = ({ assignmentId, onBack }) => {
  const [report, setReport] = useState<GroupReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Override modal
  const [overrideItem, setOverrideItem] = useState<{ id: string; name: string; currentScore: number } | null>(null);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchApi<GroupReportResponse>(`/assignments/${assignmentId}/reports/group`);
      setReport(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load group summary report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [assignmentId]);

  if (isLoading) {
    return <div className="text-center py-20 text-slate-400">กำลังโหลดรายงานผลคะแนนกลุ่ม...</div>;
  }

  if (!report) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Alert type="error">{error || 'ไม่พบข้อมูลรายงาน'}</Alert>
        <Button variant="outline" onClick={onBack} className="mt-4">
          ย้อนกลับ
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button onClick={onBack} className="text-xs text-brand-600 font-medium hover:underline flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> กลับหน้างานมอบหมาย
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Group Summary Report</h1>
          <p className="text-xs text-slate-500">
            สรุปคะแนนกลุ่ม คำนวณผ่าน Quality Index (q) &amp; Band Mapping (60%–100%)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/assignments/${assignmentId}/export/csv?report=group`, '_blank')}
          >
            <Download className="h-3.5 w-3.5 mr-1" /> Export CSV (BOM)
          </Button>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">กลุ่ม (Group Name)</th>
                <th className="px-4 py-3 text-center">จำนวนการเปรียบเทียบ</th>
                <th className="px-4 py-3 text-left">เกณฑ์ย่อย (Quality Index &amp; Weighted)</th>
                <th className="px-4 py-3 text-right">คะแนนกลุ่มสุทธิ</th>
                <th className="px-4 py-3 text-center">สัญญาณเตือน (Flags)</th>
                <th className="px-4 py-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.groups.map((g) => (
                <tr key={g.group_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {g.group_name}
                    {g.is_overridden && (
                      <span className="block text-[10px] text-purple-600 font-normal">
                        (Overridden: {g.override_reason})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-xs">{g.comparison_count} ครั้ง</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1 text-xs">
                      {g.criteria_breakdown.map((cb) => (
                        <div key={cb.criterion_id} className="flex justify-between gap-4">
                          <span className="text-slate-600 truncate max-w-xs">{cb.criterion_name}:</span>
                          <span className="font-mono text-slate-900">
                            q={formatNumber(cb.quality_index, 3)} &rarr; {formatNumber(cb.weighted_score, 2)} คะแนน
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-brand-700 text-base">
                    {formatNumber(g.is_overridden ? g.override_score : g.component_score, 3)} / {report.group_max_score}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {g.flags.length > 0 ? (
                      <div className="flex flex-wrap gap-1 justify-center">
                        {g.flags.map((f, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() =>
                        setOverrideItem({
                          id: g.group_id,
                          name: g.group_name,
                          currentScore: g.is_overridden ? g.override_score || 0 : g.component_score,
                        })
                      }
                      className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Override คะแนนกลุ่ม"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Override Modal */}
      {overrideItem && (
        <ScoreOverrideModal
          isOpen={true}
          onClose={() => setOverrideItem(null)}
          assignmentId={assignmentId}
          side="GROUP"
          itemId={overrideItem.id}
          itemName={overrideItem.name}
          currentScore={overrideItem.currentScore}
          onSuccess={loadReport}
        />
      )}
    </div>
  );
};
