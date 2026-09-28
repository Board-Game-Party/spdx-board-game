import React, { useState, useEffect } from 'react';
import { useAuth } from '../../app/AuthContext';
import { fetchApi, downloadFile } from '../../lib/api';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Alert } from '../../components/Alert';
import {
  Play, RotateCcw, Lock, Unlock, Download,
  BarChart3, ShieldAlert, Users, Layers,
  RefreshCw, Send
} from 'lucide-react';

interface FeasibilityReport {
  is_feasible: boolean;
  target_coverage: number;
  actual_coverage: number;
  workload_per_student_per_criterion: number;
  total_group_pairs: number;
  total_group_comparisons_per_criterion: number;
  total_students: number;
  total_groups: number;
  auto_reduced: boolean;
  explanation: string;
}

interface CriterionOut {
  id: string;
  side: string;
  name: string;
  description: string;
  weight_pct: number;
  display_order: number;
}

interface AssignmentDetail {
  id: string;
  classroom_id: string;
  name: string;
  slug: string;
  description: string;
  artifact_url: string;
  group_max_score: number;
  individual_max_score: number;
  group_deadline_utc?: string;
  individual_deadline_utc?: string;
  instructor_weight: number;
  target_coverage: number;
  max_workload: number;
  min_comparisons: number;
  status: string;
  published_at?: string;
  finalized_at?: string;
  criteria: CriterionOut[];
  group_pair_count: number;
  individual_pair_count: number;
}

export interface AssignmentDetailViewProps {
  assignmentId: string;
  onBack: () => void;
  onNavigateTab: (tab: string) => void;
  onEdit?: () => void;
}

export const AssignmentDetailView: React.FC<AssignmentDetailViewProps> = ({
  assignmentId,
  onBack,
  onNavigateTab,
  onEdit,
}) => {
  const { activeClassroom } = useAuth();
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [feasibility, setFeasibility] = useState<FeasibilityReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals
  const [isUnpublishModalOpen, setIsUnpublishModalOpen] = useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [allowLowConfidence, setAllowLowConfidence] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportingType, setExportingType] = useState<'csv' | 'xlsx' | null>(null);

  const isInstructor = activeClassroom?.role === 'OWNER' || activeClassroom?.role === 'CO_TEACHER';
  const isOwner = activeClassroom?.role === 'OWNER';
  const isStudent = activeClassroom?.role === 'STUDENT';

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const aRes = await fetchApi<AssignmentDetail>(`/assignments/${assignmentId}`);
      setAssignment(aRes);

      if (aRes.status === 'DRAFT') {
        const fRes = await fetchApi<FeasibilityReport>(`/assignments/${assignmentId}/feasibility`);
        setFeasibility(fRes);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load assignment');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [assignmentId]);

  const handlePublish = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await fetchApi(`/assignments/${assignmentId}:publish`, { method: 'POST' });
      setActionSuccess('Publish งานมอบหมายและจัดสรรคู่ประเมินสำเร็จ!');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Publish failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!actionReason.trim()) {
      setError('ต้องระบุเหตุผลในการ Unpublish');
      return;
    }
    setIsProcessing(true);
    try {
      await fetchApi(`/assignments/${assignmentId}:unpublish`, {
        method: 'POST',
        body: JSON.stringify({ reason: actionReason }),
      });
      setIsUnpublishModalOpen(false);
      setActionReason('');
      setActionSuccess('ยกเลิก Publish กลับสู่สถานะ DRAFT สำเร็จ');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Unpublish failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalize = async () => {
    setIsProcessing(true);
    try {
      await fetchApi(`/assignments/${assignmentId}:finalize`, {
        method: 'POST',
        body: JSON.stringify({ allow_low_confidence: allowLowConfidence, notes: actionReason || undefined }),
      });
      setIsFinalizeModalOpen(false);
      setActionSuccess('Finalize คะแนนและจัดทำ Immutable Snapshot สำเร็จ!');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Finalize failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReopen = async () => {
    if (!actionReason.trim()) {
      setError('ต้องระบุเหตุผลในการ Reopen');
      return;
    }
    setIsProcessing(true);
    try {
      await fetchApi(`/assignments/${assignmentId}:reopen`, {
        method: 'POST',
        body: JSON.stringify({ reason: actionReason }),
      });
      setIsReopenModalOpen(false);
      setActionReason('');
      setActionSuccess('Reopen คะแนนกลับเป็น CLOSED สำเร็จ');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Reopen failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecompute = async () => {
    setIsProcessing(true);
    try {
      await fetchApi(`/assignments/${assignmentId}:recompute`, { method: 'POST' });
      setActionSuccess('คำนวณคะแนน Interim ใหม่แบบ Pure Function สำเร็จ');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Recompute failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async (type: 'csv' | 'xlsx') => {
    setExportingType(type);
    setError(null);
    try {
      await downloadFile(
        `/assignments/${assignmentId}/export/${type}?mask_identities=true`,
        `assignment_${assignmentId}.${type}`
      );
    } catch (err: any) {
      setError(err.message || `Export ${type.toUpperCase()} ล้มเหลว`);
    } finally {
      setExportingType(null);
    }
  };

  const handleDelete = async () => {
    setIsProcessing(true);
    try {
      await fetchApi(`/assignments/${assignmentId}`, { method: 'DELETE' });
      setIsDeleteModalOpen(false);
      window.alert('ลบงานมอบหมายสำเร็จ');
      onBack();
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-20 text-slate-400">กำลังโหลดข้อมูลงานมอบหมาย...</div>;
  }

  if (!assignment) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Alert type="error">{error || 'ไม่พบงานมอบหมาย'}</Alert>
        <Button variant="outline" onClick={onBack} className="mt-4">
          ย้อนกลับ
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top breadcrumb & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-xs text-brand-600 font-medium hover:underline">
              &larr; กลับหน้ารายการห้องเรียน
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-mono text-slate-400">/{assignment.slug}</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{assignment.name}</h1>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                assignment.status === 'OPEN'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : assignment.status === 'FINALIZED'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : assignment.status === 'PUBLISHED'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {assignment.status}
            </span>
          </div>

          <p className="text-xs text-slate-500">{assignment.description || 'ไม่มีคำอธิบาย'}</p>
        </div>

        {/* State Machine Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Student action */}
          {isStudent && assignment.status !== 'DRAFT' && (
            <>
              <Button
                variant="primary"
                onClick={() => onNavigateTab('evaluation')}
                className="bg-brand-600"
              >
                <Send className="h-4 w-4 mr-1.5" />
                ทำแบบประเมิน (Evaluate)
              </Button>
              <Button
                variant="outline"
                onClick={() => onNavigateTab('student-score')}
              >
                ดูคะแนนของฉัน (My Score)
              </Button>
            </>
          )}

          {/* Instructor actions */}
          {isInstructor && (
            <>
              {assignment.status === 'DRAFT' && (
                <>
                  <Button
                    variant="primary"
                    onClick={handlePublish}
                    isLoading={isProcessing}
                    disabled={Boolean(feasibility && !feasibility.is_feasible)}
                  >
                    <Play className="h-4 w-4 mr-1.5" />
                    Publish & จัดคู่ประเมิน
                  </Button>
                  {onEdit && (
                    <Button
                      variant="outline"
                      onClick={onEdit}
                    >
                      Edit Assignment
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    onClick={() => setIsDeleteModalOpen(true)}
                  >
                    Delete Assignment
                  </Button>
                </>
              )}

              {(assignment.status === 'PUBLISHED' || assignment.status === 'OPEN') && (
                <>
                  <Button variant="outline" size="sm" onClick={handleRecompute} isLoading={isProcessing}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Recompute
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsUnpublishModalOpen(true)}
                    className="text-amber-600 hover:text-amber-700"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Unpublish
                  </Button>
                  {isOwner && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsFinalizeModalOpen(true)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Lock className="h-3.5 w-3.5 mr-1" /> Finalize คะแนน
                    </Button>
                  )}
                </>
              )}

              {assignment.status === 'FINALIZED' && isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReopenModalOpen(true)}
                  className="text-amber-600"
                >
                  <Unlock className="h-3.5 w-3.5 mr-1" /> Reopen คะแนน
                </Button>
              )}

              {assignment.status !== 'DRAFT' && (
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={exportingType === 'csv'}
                    disabled={exportingType !== null}
                    onClick={() => handleExport('csv')}
                  >
                    <Download className="h-3.5 w-3.5 mr-1" /> CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={exportingType === 'xlsx'}
                    disabled={exportingType !== null}
                    onClick={() => handleExport('xlsx')}
                  >
                    <Download className="h-3.5 w-3.5 mr-1" /> XLSX
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {actionSuccess && <Alert type="success">{actionSuccess}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      {/* Feasibility Check Card (US-PAIR-01) */}
      {assignment.status === 'DRAFT' && feasibility && (
        <div
          className={`p-5 rounded-2xl border text-sm space-y-2 ${
            feasibility.is_feasible
              ? feasibility.auto_reduced
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <h4 className="font-bold flex items-center gap-2">
              <Layers className="h-5 w-5" />
              การตรวจสอบความพร้อมทางคณิตศาสตร์ (Pairing Feasibility Solver &sect;8.2)
            </h4>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/60">
              {feasibility.is_feasible ? (feasibility.auto_reduced ? 'ปรับลด Coverage อัตโนมัติ' : 'พร้อมสมบูรณ์') : 'ไม่ผ่าน'}
            </span>
          </div>
          <p className="text-xs">{feasibility.explanation}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs font-medium border-t border-current/10">
            <div>นักศึกษา: {feasibility.total_students} คน</div>
            <div>จำนวนกลุ่ม: {feasibility.total_groups} กลุ่ม</div>
            <div>Coverage: {feasibility.actual_coverage} ครั้ง/คู่</div>
            <div>Workload: {feasibility.workload_per_student_per_criterion} คู่/คน/เกณฑ์</div>
          </div>
        </div>
      )}

      {/* Navigation Quick Links for Reports */}
      {assignment.status !== 'DRAFT' && isInstructor && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigateTab('group-report')}
            className="p-4 bg-white border border-slate-200 hover:border-brand-500 rounded-xl text-left space-y-1 transition-all shadow-xs"
          >
            <div className="flex items-center justify-between text-brand-600">
              <Layers className="h-5 w-5" />
              <span className="text-xs font-mono">&rarr;</span>
            </div>
            <p className="font-bold text-sm text-slate-900">Group Summary</p>
            <p className="text-xs text-slate-500">คะแนนกลุ่ม &amp; Quality Index (q)</p>
          </button>

          <button
            onClick={() => onNavigateTab('individual-report')}
            className="p-4 bg-white border border-slate-200 hover:border-brand-500 rounded-xl text-left space-y-1 transition-all shadow-xs"
          >
            <div className="flex items-center justify-between text-brand-600">
              <Users className="h-5 w-5" />
              <span className="text-xs font-mono">&rarr;</span>
            </div>
            <p className="font-bold text-sm text-slate-900">Individual Summary</p>
            <p className="text-xs text-slate-500">คะแนนบุคคล &amp; ตัวคูณ (M)</p>
          </button>

          <button
            onClick={() => onNavigateTab('coverage-report')}
            className="p-4 bg-white border border-slate-200 hover:border-brand-500 rounded-xl text-left space-y-1 transition-all shadow-xs"
          >
            <div className="flex items-center justify-between text-brand-600">
              <BarChart3 className="h-5 w-5" />
              <span className="text-xs font-mono">&rarr;</span>
            </div>
            <p className="font-bold text-sm text-slate-900">Pair Coverage</p>
            <p className="text-xs text-slate-500">ตรวจสอบคู่เปรียบเทียบ &amp; เพิ่มคน</p>
          </button>

          <button
            onClick={() => onNavigateTab('quality-report')}
            className="p-4 bg-white border border-slate-200 hover:border-brand-500 rounded-xl text-left space-y-1 transition-all shadow-xs"
          >
            <div className="flex items-center justify-between text-rose-600">
              <ShieldAlert className="h-5 w-5" />
              <span className="text-xs font-mono">&rarr;</span>
            </div>
            <p className="font-bold text-sm text-slate-900">Quality Signals</p>
            <p className="text-xs text-slate-500">ตรวจจับความผิดปกติ (QS-01..07)</p>
          </button>
        </div>
      )}

      {/* Assignment Metadata & Criteria Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Criteria */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">เกณฑ์การประเมิน (Evaluation Criteria)</h3>
            <div className="divide-y divide-slate-100 text-sm">
              {assignment.criteria.map((c) => (
                <div key={c.id} className="py-3 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {c.side}
                      </span>
                      <span className="font-semibold text-slate-900">{c.name}</span>
                    </div>
                    {c.description && <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>}
                  </div>
                  <span className="font-mono font-bold text-brand-700 text-sm">{c.weight_pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Configuration summary */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs text-xs space-y-3">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              พารามิเตอร์การให้คะแนน (&sect;9)
            </h4>
            <div className="space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span>คะแนนเต็มกลุ่ม:</span>
                <span className="font-bold text-slate-900">{assignment.group_max_score} คะแนน</span>
              </div>
              <div className="flex justify-between">
                <span>คะแนนเต็มบุคคล:</span>
                <span className="font-bold text-slate-900">{assignment.individual_max_score} คะแนน</span>
              </div>
              <div className="flex justify-between">
                <span>Band Mapping Floor:</span>
                <span className="font-mono text-slate-900">60.0%</span>
              </div>
              <div className="flex justify-between">
                <span>Band Mapping Ceiling:</span>
                <span className="font-mono text-slate-900">100.0%</span>
              </div>
              <div className="flex justify-between">
                <span>Participation Threshold:</span>
                <span className="font-mono text-slate-900">90.0%</span>
              </div>
              <div className="flex justify-between">
                <span>Instructor Weight:</span>
                <span className="font-mono text-slate-900">{assignment.instructor_weight}x</span>
              </div>
            </div>
          </div>

          {assignment.artifact_url && (
            <div className="bg-brand-50/50 border border-brand-200 rounded-2xl p-4 text-xs space-y-1">
              <span className="font-bold text-brand-900">Deliverable Link (A5)</span>
              <a
                href={assignment.artifact_url}
                target="_blank"
                rel="noreferrer"
                className="block text-brand-600 hover:underline truncate"
              >
                {assignment.artifact_url}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Unpublish Modal */}
      <Modal isOpen={isUnpublishModalOpen} onClose={() => setIsUnpublishModalOpen(false)} title="ยกเลิก Publish (Unpublish Assignment)">
        <div className="space-y-4 text-sm">
          <Alert type="warning">
            การ Unpublish จะยกเลิกชุดคู่ประเมิน (Pairs) เดิม และเปิดให้แก้ไข Criteria หรือ Roster ได้อีกครั้ง
          </Alert>
          <div>
            <label className="block text-xs font-semibold text-slate-700">เหตุผลประกอบ (Mandatory Reason)</label>
            <textarea
              required
              rows={3}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="ระบุเหตุผลในการแก้ไขเกณฑ์หรือสมาชิก..."
              className="mt-1 block w-full p-2.5 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsUnpublishModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="danger" onClick={handleUnpublish} isLoading={isProcessing}>
              ยืนยัน Unpublish
            </Button>
          </div>
        </div>
      </Modal>

      {/* Finalize Modal */}
      <Modal isOpen={isFinalizeModalOpen} onClose={() => setIsFinalizeModalOpen(false)} title="Finalize คะแนนและบันทึก Snapshot">
        <div className="space-y-4 text-sm">
          <p className="text-slate-600 text-xs">
            การ Finalize จะคำนวณคะแนนสุทธิ บันทึก Immutable Snapshot และส่งการแจ้งเตือนแก่นักศึกษาทุกคน
          </p>
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={allowLowConfidence}
              onChange={(e) => setAllowLowConfidence(e.target.checked)}
              className="text-purple-600 focus:ring-purple-500 rounded"
            />
            <span>อนุญาตให้ Finalize แม้มีรายการที่ได้รับผลประเมินน้อย (LOW_CONFIDENCE)</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsFinalizeModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="primary" onClick={handleFinalize} isLoading={isProcessing} className="bg-purple-600">
              ยืนยัน Finalize
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reopen Modal */}
      <Modal isOpen={isReopenModalOpen} onClose={() => setIsReopenModalOpen(false)} title="Reopen คะแนนกลับเป็น CLOSED">
        <div className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700">เหตุผลประกอบ (Mandatory Reason)</label>
            <textarea
              required
              rows={3}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="ระบุเหตุผลในการ Reopen เพื่อพิจารณาคะแนนใหม่..."
              className="mt-1 block w-full p-2.5 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsReopenModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="secondary" onClick={handleReopen} isLoading={isProcessing}>
              ยืนยัน Reopen
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="ลบงานมอบหมาย (Delete Assignment)">
        <div className="space-y-4 text-sm">
          <Alert type="warning">
            การลบงานมอบหมายจะเป็นการลบอย่างถาวร รวมถึงเกณฑ์การให้คะแนนและข้อมูลที่เกี่ยวข้องทั้งหมด คุณแน่ใจหรือไม่ที่จะลบงานมอบหมายนี้?
          </Alert>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isProcessing}>
              ยืนยันการลบ
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
