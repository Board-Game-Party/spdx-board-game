import React, { useState, useEffect } from 'react';
import { fetchApi, downloadFile } from '../../lib/api';
import { Button } from '../../components/Button';
import { Alert } from '../../components/Alert';
import { formatNumber } from '../../lib/utils';
import { ArrowLeft, Download, Edit3 } from 'lucide-react';
import { ScoreOverrideModal } from '../audit/ScoreOverrideModal';

interface IndividualScoreSummary {
  student_user_id: string;
  display_name: string;
  email: string;
  student_id?: string;
  group_name?: string;
  group_component_score: number;
  individual_component_score: number;
  raw_total_score: number;
  assigned_comparisons: number;
  submitted_comparisons: number;
  participation_ratio: number;
  participation_multiplier: number;
  net_final_score: number;
  max_possible_score: number;
  flags: string[];
  is_overridden: boolean;
  override_score?: number;
  override_reason?: string;
}

interface IndividualReportResponse {
  assignment_id: string;
  assignment_name: string;
  status: string;
  total_max_score: number;
  students: IndividualScoreSummary[];
}

export interface IndividualReportViewProps {
  assignmentId: string;
  onBack: () => void;
}

export const IndividualReportView: React.FC<IndividualReportViewProps> = ({ assignmentId, onBack }) => {
  const [report, setReport] = useState<IndividualReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Override modal
  const [overrideItem, setOverrideItem] = useState<{ id: string; name: string; currentScore: number } | null>(null);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchApi<IndividualReportResponse>(`/assignments/${assignmentId}/reports/individual`);
      setReport(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load individual summary report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [assignmentId]);

  if (isLoading) {
    return <div className="text-center py-20 text-slate-400">กำลังโหลดรายงานคะแนนรายบุคคล...</div>;
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
          <h1 className="text-2xl font-bold text-slate-900">Individual Summary Report</h1>
          <p className="text-xs text-slate-500">
            สรุปคะแนนนักศึกษาทุกคน: คะแนนกลุ่ม + คะแนนบุคคล &times; Participation Multiplier (M)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            isLoading={isExporting}
            onClick={async () => {
              setIsExporting(true);
              setError(null);
              try {
                await downloadFile(`/assignments/${assignmentId}/export/csv?report=individual`, 'individual_report.csv');
              } catch (err: any) {
                setError(err.message || 'Export ล้มเหลว');
              } finally {
                setIsExporting(false);
              }
            }}
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
                <th className="px-4 py-3 text-left">รหัส / ชื่อ / อีเมล</th>
                <th className="px-4 py-3 text-left">กลุ่ม (Group)</th>
                <th className="px-4 py-3 text-right">คะแนนกลุ่ม</th>
                <th className="px-4 py-3 text-right">คะแนนบุคคล</th>
                <th className="px-4 py-3 text-center">การมีส่วนร่วม (p / M)</th>
                <th className="px-4 py-3 text-right font-bold">คะแนนสุทธิ (Net Final)</th>
                <th className="px-4 py-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.students.map((s) => (
                <tr key={s.student_user_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{s.display_name}</p>
                    <p className="text-xs text-slate-400 font-mono">
                      {s.student_id ? `${s.student_id} · ` : ''}{s.email}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2.5 py-1 bg-slate-100 rounded-md font-medium text-slate-700">
                      {s.group_name || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {formatNumber(s.group_component_score, 2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {formatNumber(s.individual_component_score, 2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="text-xs">
                      <span className="font-mono text-slate-700">
                        {s.submitted_comparisons}/{s.assigned_comparisons} ({Math.round(s.participation_ratio * 100)}%)
                      </span>
                      <span className="block font-bold text-brand-700 text-[11px]">
                        M = {formatNumber(s.participation_multiplier, 3)}x
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-base text-brand-700">
                    {formatNumber(s.net_final_score, 2)} / {report.total_max_score}
                    {s.is_overridden && (
                      <span className="block text-[10px] text-purple-600 font-normal">
                        (Overridden: {s.override_reason})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() =>
                        setOverrideItem({
                          id: s.student_user_id,
                          name: s.display_name,
                          currentScore: s.net_final_score,
                        })
                      }
                      className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Override คะแนนนักศึกษา"
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
          side="INDIVIDUAL"
          itemId={overrideItem.id}
          itemName={overrideItem.name}
          currentScore={overrideItem.currentScore}
          onSuccess={loadReport}
        />
      )}
    </div>
  );
};
