import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Alert } from '../../components/Alert';
import { ForcedChoiceScale } from './components/ForcedChoiceScale';
import { ComparisonItemCard } from './components/ComparisonItemCard';
import { AutosaveBadge } from './components/AutosaveBadge';
import { useAutosave } from './hooks/useAutosave';
import { useComparisonQueue } from './hooks/useComparisonQueue';
import { formatDate } from '../../lib/utils';
import {
  Layers, Users, Clock, AlertTriangle,
  ArrowLeft, Send
} from 'lucide-react';

interface EvaluationItemCardData {
  id: string;
  name: string;
  artifact_url?: string;
  member_names: string[];
}

interface ComparisonItem {
  pair_assignment_id: string;
  side: string;
  criterion_id: string;
  criterion_name: string;
  criterion_description: string;
  display_order: number;
  left_item: EvaluationItemCardData;
  right_item: EvaluationItemCardData;
  current_choice: number | null;
  status: string;
  time_on_task_ms: number;
}

interface EvaluationSection {
  criterion_id: string;
  criterion_name: string;
  criterion_description: string;
  weight_pct: number;
  comparisons: ComparisonItem[];
  answered_count: number;
  total_count: number;
}

interface WorksheetData {
  assignment_id: string;
  assignment_name: string;
  artifact_url: string;
  side: string;
  status: string;
  is_submitted: boolean;
  deadline_utc?: string;
  total_comparisons: number;
  answered_comparisons: number;
  progress_pct: number;
  sections: EvaluationSection[];
  participation_ratio: number;
  participation_multiplier: number;
}

export interface EvaluationWorksheetViewProps {
  assignmentId: string;
  onBack: () => void;
}

export const EvaluationWorksheetView: React.FC<EvaluationWorksheetViewProps> = ({
  assignmentId,
  onBack,
}) => {
  const [side, setSide] = useState<'GROUP' | 'INDIVIDUAL'>('GROUP');
  const [worksheet, setWorksheet] = useState<WorksheetData | null>(null);
  const [choices, setChoices] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Submit modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { saveStatus, lastSavedTime, triggerAutosave } = useAutosave(1200);
  useComparisonQueue(() => loadWorksheet());

  const loadWorksheet = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchApi<WorksheetData>(`/assignments/${assignmentId}/evaluations?side=${side}`);
      setWorksheet(res);

      // Populate local choices map
      const initialChoices: Record<string, number> = {};
      res.sections.forEach((sec) => {
        sec.comparisons.forEach((c) => {
          if (c.current_choice !== null && c.current_choice !== undefined) {
            initialChoices[c.pair_assignment_id] = c.current_choice;
          }
        });
      });
      setChoices(initialChoices);
    } catch (err: any) {
      setError(err.message || 'Failed to load evaluation worksheet');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorksheet();
  }, [assignmentId, side]);

  const handleChoiceChange = (pairId: string, choiceVal: number) => {
    setChoices((prev) => ({ ...prev, [pairId]: choiceVal }));
    triggerAutosave(pairId, choiceVal, 3000);
  };

  const answeredCount = Object.keys(choices).length;
  const totalCount = worksheet?.total_comparisons || 0;
  const unansweredCount = Math.max(0, totalCount - answeredCount);
  const progressPct = totalCount > 0 ? (answeredCount / totalCount) * 100 : 100;

  const isDeadlinePassed = worksheet?.deadline_utc
    ? new Date() > new Date(worksheet.deadline_utc)
    : false;

  const handleSubmit = async (confirmIncomplete: boolean = false) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetchApi<any>(`/assignments/${assignmentId}/evaluations:submit`, {
        method: 'POST',
        body: JSON.stringify({
          side,
          confirm_incomplete: confirmIncomplete,
        }),
      });
      setIsSubmitModalOpen(false);
      setSubmitSuccess(res.message || 'ส่งผลการประเมินเรียบร้อยแล้ว!');
      await loadWorksheet();
    } catch (err: any) {
      setError(err.message || 'Submit failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-20 text-slate-400">กำลังโหลดแบบประเมิน...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button onClick={onBack} className="text-xs text-brand-600 font-medium hover:underline flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> กลับหน้างานมอบหมาย
          </button>
          <h1 className="text-2xl font-bold text-slate-900">{worksheet?.assignment_name}</h1>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {worksheet?.deadline_utc && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                กำหนดส่ง: {formatDate(worksheet.deadline_utc)}
              </span>
            )}
          </div>
        </div>

        {/* Autosave status badge */}
        <div className="flex items-center gap-3">
          <AutosaveBadge status={saveStatus} lastSavedTime={lastSavedTime} />
        </div>
      </div>

      {submitSuccess && <Alert type="success">{submitSuccess}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      {/* Side Toggle: Group vs Individual */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit text-xs font-semibold">
        <button
          onClick={() => setSide('GROUP')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
            side === 'GROUP' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="h-4 w-4" />
          การประเมินกลุ่ม (Group Evaluation)
        </button>

        <button
          onClick={() => setSide('INDIVIDUAL')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
            side === 'INDIVIDUAL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="h-4 w-4" />
          การประเมินเพื่อนร่วมกลุ่ม (Individual Peer)
        </button>
      </div>

      {/* Progress & Real-time Participation Multiplier Card (FR-SCORE-13) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex justify-between items-center text-xs">
          <div className="font-semibold text-slate-700">
            ความคืบหน้า: {answeredCount} / {totalCount} ข้อ ({Math.round(progressPct)}%)
          </div>
          <div className="font-mono text-slate-500">
            Participation Multiplier (M):{' '}
            <span className="font-bold text-brand-700">
              {worksheet?.participation_multiplier !== undefined ? worksheet.participation_multiplier.toFixed(2) : '1.00'}x
            </span>
          </div>
        </div>

        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-brand-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Empty / Small Group Message */}
      {worksheet?.total_comparisons === 0 && (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl p-6 space-y-2">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
          <h3 className="font-bold text-slate-800">ไม่มีคู่ประเมินสำหรับส่วนนี้</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {side === 'INDIVIDUAL'
              ? 'กลุ่มของคุณมีขนาดไม่เกิน 2 คน จึงไม่จำเป็นต้องทำแบบประเมินรายบุคคล (FR-PAIR-12 / FR-EVAL-12)'
              : 'ยังไม่มีคู่เปรียบเทียบถูกจัดสรรในงานมอบหมายนี้'}
          </p>
        </div>
      )}

      {/* Evaluation Questions Grouped by Criterion (FR-EVAL-01) */}
      {worksheet?.sections.map((sec) => (
        <div key={sec.criterion_id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-base text-slate-900">{sec.criterion_name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{sec.criterion_description}</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg">
              น้ำหนัก {sec.weight_pct}%
            </span>
          </div>

          <div className="space-y-8 divide-y divide-slate-100">
            {sec.comparisons.map((c, idx) => (
              <div key={c.pair_assignment_id} className={idx > 0 ? 'pt-8 space-y-4' : 'space-y-4'}>
                {/* Left & Right Item Cards (A5) */}
                <div className="flex flex-col sm:flex-row gap-4 items-stretch">
                  <ComparisonItemCard
                    name={c.left_item.name}
                    artifactUrl={c.left_item.artifact_url}
                    memberNames={c.left_item.member_names}
                    side="left"
                  />
                  <ComparisonItemCard
                    name={c.right_item.name}
                    artifactUrl={c.right_item.artifact_url}
                    memberNames={c.right_item.member_names}
                    side="right"
                  />
                </div>

                {/* 6-Point Forced Choice Scale (D1) */}
                <ForcedChoiceScale
                  pairAssignmentId={c.pair_assignment_id}
                  leftItemName={c.left_item.name}
                  rightItemName={c.right_item.name}
                  value={choices[c.pair_assignment_id] || null}
                  disabled={isDeadlinePassed}
                  onChange={(val) => handleChoiceChange(c.pair_assignment_id, val)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Submit Action Bar */}
      {worksheet && worksheet.total_comparisons > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4 sticky bottom-4 z-20">
          <div>
            <p className="text-xs font-semibold text-slate-800">
              {worksheet.is_submitted ? 'คุณได้ส่งผลการประเมินแล้ว (สามารถ Re-submit ได้ก่อน Deadline)' : 'พร้อมส่งผลการประเมิน'}
            </p>
            <p className="text-[11px] text-slate-500">
              {unansweredCount > 0
                ? `ยังตอบไม่ครบอีก ${unansweredCount} ข้อ`
                : 'ตอบครบทุกข้อเรียบร้อยแล้ว'}
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            disabled={isDeadlinePassed}
            onClick={() => {
              if (unansweredCount > 0) {
                setIsSubmitModalOpen(true);
              } else {
                handleSubmit(false);
              }
            }}
          >
            <Send className="h-4 w-4 mr-2" />
            {worksheet.is_submitted ? 'ส่งผลการประเมินใหม่ (Re-submit)' : 'ส่งผลการประเมิน (Submit)'}
          </Button>
        </div>
      )}

      {/* Confirmation Modal when Incomplete (US-EVAL-03 / FR-EVAL-05) */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="ยืนยันการส่งผลประเมิน"
      >
        <div className="space-y-4 text-sm">
          <Alert type="warning" title="ตอบยังไม่ครบทุกข้อ">
            คุณมีข้อที่ยังไม่ได้ตอบจำนวน <strong>{unansweredCount} ข้อ</strong> (จากทั้งหมด {totalCount} ข้อ)
            <br />
            การส่งโดยตอบไม่ครบจะส่งผลต่อค่าตัวคูณการมีส่วนร่วม (Participation Multiplier)
          </Alert>

          <p className="text-xs text-slate-600">
            คุณสามารถกดยืนยันส่งเพื่อบันทึกข้อที่ทำเสร็จแล้ว และสามารถกลับมาแก้ไขและ Re-submit ได้จนกว่าจะถึงกำหนดส่ง
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsSubmitModalOpen(false)}>
              กลับไปทำต่อ
            </Button>
            <Button
              variant="primary"
              isLoading={isSubmitting}
              onClick={() => handleSubmit(true)}
            >
              ยืนยันส่งผลประเมิน
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
