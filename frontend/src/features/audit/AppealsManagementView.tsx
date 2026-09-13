import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Alert } from '../../components/Alert';
import { formatDate } from '../../lib/utils';
import { MessageSquare, ArrowLeft } from 'lucide-react';

interface AppealOut {
  id: string;
  assignment_id: string;
  assignment_name: string;
  student_user_id: string;
  student_name: string;
  message: string;
  status: string;
  resolution?: string;
  resolved_by_name?: string;
  created_at: string;
  resolved_at?: string;
}

export interface AppealsManagementViewProps {
  assignmentId: string;
  onBack: () => void;
}

export const AppealsManagementView: React.FC<AppealsManagementViewProps> = ({ assignmentId, onBack }) => {
  const [appeals, setAppeals] = useState<AppealOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve modal
  const [selectedAppeal, setSelectedAppeal] = useState<AppealOut | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<'RESOLVED' | 'REJECTED'>('RESOLVED');
  const [resolutionText, setResolutionText] = useState('');
  const [overrideScore, setOverrideScore] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadAppeals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchApi<AppealOut[]>(`/assignments/${assignmentId}/appeals`);
      setAppeals(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load appeals');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppeals();
  }, [assignmentId]);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppeal) return;
    setIsProcessing(true);
    setError(null);
    try {
      await fetchApi(`/assignments/${assignmentId}/appeals/${selectedAppeal.id}:resolve`, {
        method: 'POST',
        body: JSON.stringify({
          status: resolutionStatus,
          resolution: resolutionText,
          override_score: overrideScore ? Number(overrideScore) : undefined,
        }),
      });
      setSelectedAppeal(null);
      setResolutionText('');
      setOverrideScore('');
      await loadAppeals();
    } catch (err: any) {
      setError(err.message || 'Failed to resolve appeal');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-20 text-slate-400">กำลังโหลดคำร้องอุทธรณ์คะแนน...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <button onClick={onBack} className="text-xs text-brand-600 font-medium hover:underline flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> กลับหน้างานมอบหมาย
          </button>
          <h1 className="text-2xl font-bold text-slate-900">คำร้องอุทธรณ์คะแนน (Student Score Appeals)</h1>
          <p className="text-xs text-slate-500">
            พิจารณาคำร้องจากนักศึกษาภายใน 7 วันหลัง Finalize คะแนน (US-APPEAL-01)
          </p>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {appeals.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-6">
          <MessageSquare className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <h3 className="font-bold text-slate-700">ไม่มีคำร้องอุทธรณ์คะแนน</h3>
        </div>
      ) : (
        <div className="space-y-4">
          {appeals.map((a) => (
            <div key={a.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{a.student_name}</h4>
                  <p className="text-xs text-slate-400">{formatDate(a.created_at)}</p>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    a.status === 'OPEN'
                      ? 'bg-amber-100 text-amber-800'
                      : a.status === 'RESOLVED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {a.status}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700">
                <p className="font-semibold text-slate-500 mb-0.5">ข้อความคำร้อง:</p>
                <p>{a.message}</p>
              </div>

              {a.resolution && (
                <div className="p-3 bg-purple-50 rounded-xl text-xs text-purple-900">
                  <p className="font-semibold text-purple-700 mb-0.5">
                    ผลการพิจารณา (โดย {a.resolved_by_name || 'อาจารย์'}):
                  </p>
                  <p>{a.resolution}</p>
                </div>
              )}

              {a.status === 'OPEN' && (
                <div className="flex justify-end pt-2">
                  <Button variant="primary" size="sm" onClick={() => setSelectedAppeal(a)}>
                    พิจารณาคำร้องนี้
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resolve Modal */}
      {selectedAppeal && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAppeal(null)}
          title={`พิจารณาคำร้องของ: ${selectedAppeal.student_name}`}
        >
          <form onSubmit={handleResolve} className="space-y-4 text-sm">
            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
              <p className="font-semibold">ข้อความของนักศึกษา:</p>
              <p className="mt-1">{selectedAppeal.message}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">ผลการพิจารณา</label>
              <select
                value={resolutionStatus}
                onChange={(e) => setResolutionStatus(e.target.value as any)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="RESOLVED">อนุมัติ / ปรับปรุงคะแนน (RESOLVED)</option>
                <option value="REJECTED">ยกคำร้อง / ยืนยันคะแนนเดิม (REJECTED)</option>
              </select>
            </div>

            {resolutionStatus === 'RESOLVED' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  คะแนนสุทธิใหม่ (ทางเลือก — เว้นว่างหากไม่ต้องการแก้คะแนน)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={overrideScore}
                  onChange={(e) => setOverrideScore(e.target.value)}
                  placeholder="e.g. 18.5"
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700">คำชี้แจงแก่นักศึกษา (Resolution Explanation)</label>
              <textarea
                required
                rows={3}
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                placeholder="ระบุเหตุผลและคำตอบ..."
                className="mt-1 block w-full p-2.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button variant="outline" type="button" onClick={() => setSelectedAppeal(null)}>
                ยกเลิก
              </Button>
              <Button variant="primary" type="submit" isLoading={isProcessing}>
                บันทึกผลการพิจารณา
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
