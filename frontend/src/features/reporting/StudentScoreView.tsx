import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Alert } from '../../components/Alert';
import { formatNumber } from '../../lib/utils';
import { GraduationCap, ArrowLeft, MessageSquare } from 'lucide-react';

interface StudentScoreViewResponse {
  assignment_id: string;
  assignment_name: string;
  group_name?: string;
  group_score: number;
  group_max_score: number;
  individual_score?: number | null;
  individual_max_score: number;
  participation_ratio: number;
  participation_multiplier: number;
  net_score: number;
  total_max_score: number;
  is_final: boolean;
  status_label: string;
  k_anonymity_satisfied: boolean;
  k_anonymity_notice?: string | null;
}

export interface StudentScoreViewProps {
  assignmentId: string;
  onBack: () => void;
}

export const StudentScoreView: React.FC<StudentScoreViewProps> = ({ assignmentId, onBack }) => {
  const [scoreData, setScoreData] = useState<StudentScoreViewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Appeal modal
  const [isAppealOpen, setIsAppealOpen] = useState(false);
  const [appealMessage, setAppealMessage] = useState('');
  const [appealSuccess, setAppealSuccess] = useState<string | null>(null);
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);

  const loadScore = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchApi<StudentScoreViewResponse>(`/assignments/${assignmentId}/my-score`);
      setScoreData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load score report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScore();
  }, [assignmentId]);

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAppeal(true);
    setError(null);
    try {
      await fetchApi(`/assignments/${assignmentId}/appeals`, {
        method: 'POST',
        body: JSON.stringify({ message: appealMessage }),
      });
      setIsAppealOpen(false);
      setAppealMessage('');
      setAppealSuccess('ส่งคำร้องอุทธรณ์คะแนนเรียบร้อยแล้ว อาจารย์ผู้สอนจะพิจารณาในระบบ');
    } catch (err: any) {
      setError(err.message || 'Failed to submit appeal');
    } finally {
      setIsSubmittingAppeal(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-20 text-slate-400">กำลังโหลดผลคะแนนของคุณ...</div>;
  }

  if (!scoreData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Alert type="error">{error || 'ไม่พบผลคะแนน'}</Alert>
        <Button variant="outline" onClick={onBack} className="mt-4">
          ย้อนกลับ
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-xs text-brand-600 font-medium hover:underline flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> กลับหน้างานมอบหมาย
        </button>
        <span
          className={`text-xs font-bold px-3 py-1 rounded-full ${
            scoreData.is_final ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
          }`}
        >
          {scoreData.status_label}
        </span>
      </div>

      {appealSuccess && <Alert type="success">{appealSuccess}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      {/* Main Score Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center space-y-4">
        <div className="inline-flex p-3 bg-brand-50 text-brand-600 rounded-2xl">
          <GraduationCap className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{scoreData.assignment_name}</h1>
          {scoreData.group_name && (
            <p className="text-xs text-slate-500 mt-0.5">กลุ่ม: {scoreData.group_name}</p>
          )}
        </div>

        <div className="py-4">
          <div className="text-5xl font-black text-brand-700 tracking-tight">
            {formatNumber(scoreData.net_score, 2)}
            <span className="text-2xl font-bold text-slate-400 font-normal"> / {scoreData.total_max_score}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">คะแนนสุทธิหลังปรับตาม Participation Multiplier</p>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-100 text-left text-xs">
          <div className="p-3 bg-slate-50 rounded-xl space-y-1">
            <span className="text-slate-500 font-medium">คะแนนส่วนกลุ่ม (Group)</span>
            <p className="text-base font-bold text-slate-900">
              {formatNumber(scoreData.group_score, 2)} / {scoreData.group_max_score}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl space-y-1">
            <span className="text-slate-500 font-medium">คะแนนรายบุคคล (Individual)</span>
            {scoreData.k_anonymity_satisfied ? (
              <p className="text-base font-bold text-slate-900">
                {scoreData.individual_score !== null && scoreData.individual_score !== undefined
                  ? `${formatNumber(scoreData.individual_score, 2)} / ${scoreData.individual_max_score}`
                  : '-'}
              </p>
            ) : (
              <p className="text-xs font-semibold text-amber-700">
                {scoreData.k_anonymity_notice || 'ยังมีข้อมูลไม่เพียงพอ (k-anonymity)'}
              </p>
            )}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl space-y-1">
            <span className="text-slate-500 font-medium">Participation Multiplier</span>
            <p className="text-base font-bold text-brand-700">
              {formatNumber(scoreData.participation_multiplier, 3)}x ({Math.round(scoreData.participation_ratio * 100)}%)
            </p>
          </div>
        </div>

        {/* Appeal Button (US-APPEAL-01) */}
        {scoreData.is_final && (
          <div className="pt-4 flex justify-center">
            <Button variant="outline" size="sm" onClick={() => setIsAppealOpen(true)}>
              <MessageSquare className="h-4 w-4 mr-1.5" /> ยื่นคำร้องขออุทธรณ์คะแนน (Appeal Score)
            </Button>
          </div>
        )}
      </div>

      {/* Appeal Modal */}
      <Modal isOpen={isAppealOpen} onClose={() => setIsAppealOpen(false)} title="ยื่นคำร้องอุทธรณ์คะแนน (Student Score Appeal)">
        <form onSubmit={handleSubmitAppeal} className="space-y-4 text-sm">
          <p className="text-xs text-slate-600">
            คุณสามารถยื่นคำร้องพร้อมข้อความอธิบายเหตุผลแก่อาจารย์ผู้สอนได้ภายใน 7 วันหลังการ Finalize คะแนน
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700">รายละเอียดคำร้อง (Appeal Message)</label>
            <textarea
              required
              rows={4}
              value={appealMessage}
              onChange={(e) => setAppealMessage(e.target.value)}
              placeholder="ระบุเหตุผลและหลักฐานประกอบ เช่น ข้อมูลการทำงานในกลุ่ม หรือข้อผิดพลาดที่พบ..."
              className="mt-1 block w-full p-2.5 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsAppealOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmittingAppeal}>
              ส่งคำร้องอุทธรณ์
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
