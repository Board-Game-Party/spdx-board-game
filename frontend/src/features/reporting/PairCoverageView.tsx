import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Alert } from '../../components/Alert';
import { formatNumber } from '../../lib/utils';
import { ArrowLeft, Download, Plus } from 'lucide-react';

interface PairCoverageItem {
  pair_id: string;
  criterion_id: string;
  criterion_name: string;
  side: string;
  item_a_id: string;
  item_a_name: string;
  item_b_id: string;
  item_b_name: string;
  target_coverage: number;
  actual_coverage: number;
  mean_choice?: number;
  is_low_coverage: boolean;
  assigned_evaluator_count: number;
  submitted_evaluator_count: number;
}

interface PairCoverageReportResponse {
  assignment_id: string;
  target_coverage: number;
  total_pairs: number;
  low_coverage_pair_count: number;
  pairs: PairCoverageItem[];
}

export interface PairCoverageViewProps {
  assignmentId: string;
  onBack: () => void;
}

export const PairCoverageView: React.FC<PairCoverageViewProps> = ({ assignmentId, onBack }) => {
  const [report, setReport] = useState<PairCoverageReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Extra evaluator modal
  const [selectedPair, setSelectedPair] = useState<PairCoverageItem | null>(null);
  const [extraEvaluatorEmail, setExtraEvaluatorEmail] = useState('');
  const [isSelfInstructor, setIsSelfInstructor] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchApi<PairCoverageReportResponse>(`/assignments/${assignmentId}/reports/coverage`);
      setReport(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load coverage report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [assignmentId]);

  const handleAssignExtra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPair) return;
    setIsAssigning(true);
    setError(null);
    try {
      await fetchApi(`/assignments/${assignmentId}/pairs:assign-extra`, {
        method: 'POST',
        body: JSON.stringify({
          criterion_id: selectedPair.criterion_id,
          side: selectedPair.side,
          item_a_id: selectedPair.item_a_id,
          item_b_id: selectedPair.item_b_id,
          evaluator_user_id: !isSelfInstructor ? extraEvaluatorEmail : undefined,
          is_instructor_self: isSelfInstructor,
        }),
      });
      setSelectedPair(null);
      setExtraEvaluatorEmail('');
      setIsSelfInstructor(false);
      setActionSuccess('มอบหมายผู้ประเมินเพิ่มเติมสำเร็จ!');
      await loadReport();
    } catch (err: any) {
      setError(err.message || 'Failed to assign extra evaluator');
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-20 text-slate-400">กำลังโหลดรายงาน Pair Coverage...</div>;
  }

  if (!report) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Alert type="error">{error || 'ไม่พบรายงาน'}</Alert>
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
          <h1 className="text-2xl font-bold text-slate-900">Pair Coverage &amp; Balance Report</h1>
          <p className="text-xs text-slate-500">
            ตรวจสอบจำนวนครั้งที่แต่ละคู่ได้รับการประเมินจริง (Target: {report.target_coverage} ครั้ง/คู่)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/assignments/${assignmentId}/export/csv?report=coverage`, '_blank')}
          >
            <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {actionSuccess && <Alert type="success">{actionSuccess}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      {report.low_coverage_pair_count > 0 && (
        <Alert type="warning" title="พบข้อเปรียบเทียบที่ได้รับผลประเมินน้อย (Low Coverage)">
          มีจำนวน {report.low_coverage_pair_count} คู่ที่ได้รับการประเมินน้อยกว่าเกณฑ์ขั้นต่ำ คุณสามารถกดปุ่ม "เพิ่มผู้ประเมิน" หรือประเมินด้วยตนเองเพื่อเพิ่มความเที่ยงตรงได้
        </Alert>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">เกณฑ์ (Criterion)</th>
                <th className="px-4 py-3 text-left">คู่เปรียบเทียบ (Pair Items)</th>
                <th className="px-4 py-3 text-center">ความครอบคลุม (Actual / Target)</th>
                <th className="px-4 py-3 text-center">คะแนนเฉลี่ยตัวเลือก (Mean Choice 1-6)</th>
                <th className="px-4 py-3 text-center">สถานะ</th>
                <th className="px-4 py-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.pairs.map((p) => (
                <tr key={p.pair_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {p.side}
                    </span>
                    <p className="font-semibold text-slate-900 mt-1">{p.criterion_name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-brand-700">{p.item_a_name}</span>
                    <span className="text-xs text-slate-400 mx-2 font-mono">VS</span>
                    <span className="font-bold text-purple-700">{p.item_b_name}</span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-xs">
                    <span className={p.is_low_coverage ? 'text-amber-600 font-bold' : 'text-slate-900 font-semibold'}>
                      {p.actual_coverage} / {p.target_coverage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-xs">
                    {p.mean_choice !== null && p.mean_choice !== undefined ? (
                      <span>{formatNumber(p.mean_choice, 2)}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.is_low_coverage ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        LOW COVERAGE
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        HEALTHY
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPair(p)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> เพิ่มผู้ประเมิน
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extra evaluator modal */}
      {selectedPair && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedPair(null)}
          title={`เพิ่มผู้ประเมินคู่: ${selectedPair.item_a_name} vs ${selectedPair.item_b_name}`}
        >
          <form onSubmit={handleAssignExtra} className="space-y-4 text-sm">
            <p className="text-xs text-slate-600">
              เกณฑ์: <strong>{selectedPair.criterion_name}</strong> ({selectedPair.side})
            </p>

            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={isSelfInstructor}
                onChange={(e) => setIsSelfInstructor(e.target.checked)}
                className="text-brand-600 focus:ring-brand-500 rounded"
              />
              <span>อาจารย์ประเมินคู่นี้ด้วยตนเอง (Instructor Self-Evaluation)</span>
            </label>

            {!isSelfInstructor && (
              <div>
                <label className="block text-xs font-semibold text-slate-700">User ID หรือ Email ของผู้ประเมิน</label>
                <input
                  type="text"
                  required
                  value={extraEvaluatorEmail}
                  onChange={(e) => setExtraEvaluatorEmail(e.target.value)}
                  placeholder="user_id หรือ email นักศึกษา"
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button variant="outline" type="button" onClick={() => setSelectedPair(null)}>
                ยกเลิก
              </Button>
              <Button variant="primary" type="submit" isLoading={isAssigning}>
                บันทึกการมอบหมาย
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
