import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import { Button } from '../../components/Button';
import { Alert } from '../../components/Alert';
import { Plus, Trash2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

interface CriterionInput {
  id?: string;
  side: 'GROUP' | 'INDIVIDUAL';
  name: string;
  description: string;
  weight_pct: number;
}

export interface AssignmentSetupViewProps {
  classroomId: string;
  editAssignmentId?: string;
  onSuccess: (assignmentId: string) => void;
  onCancel: () => void;
}

export const AssignmentSetupView: React.FC<AssignmentSetupViewProps> = ({
  classroomId,
  editAssignmentId,
  onSuccess,
  onCancel,
}) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [artifactUrl, setArtifactUrl] = useState('');
  const [groupMaxScore, setGroupMaxScore] = useState(15.0);
  const [individualMaxScore, setIndividualMaxScore] = useState(5.0);
  const [groupDeadline, setGroupDeadline] = useState('');
  const [targetCoverage] = useState(5);
  const [maxWorkload] = useState(8);

  const [criteria, setCriteria] = useState<CriterionInput[]>([
    { side: 'GROUP', name: 'User Experience (UX)', description: 'ความง่ายและความลื่นไหลในการใช้งาน', weight_pct: 40.0 },
    { side: 'GROUP', name: 'Completeness', description: 'ความสมบูรณ์ของฟีเจอร์ตามโจทย์', weight_pct: 35.0 },
    { side: 'GROUP', name: 'Innovation', description: 'ความคิดสร้างสรรค์และคุณค่าใหม่', weight_pct: 25.0 },
    { side: 'INDIVIDUAL', name: 'Teamwork & Reliability', description: 'การทำงานร่วมกับเพื่อนในกลุ่มและความรับผิดชอบ', weight_pct: 50.0 },
    { side: 'INDIVIDUAL', name: 'Execution & Quality', description: 'คุณภาพชิ้นงานที่ส่งมอบตามที่ได้รับมอบหมาย', weight_pct: 50.0 },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(!!editAssignmentId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editAssignmentId) {
      setIsFetchingData(true);
      fetchApi(`/assignments/${editAssignmentId}`)
        .then((data: any) => {
          setName(data.name || '');
          setSlug(data.slug || '');
          setDescription(data.description || '');
          setArtifactUrl(data.artifact_url || '');
          setGroupMaxScore(data.group_max_score || 15.0);
          setIndividualMaxScore(data.individual_max_score || 5.0);
          if (data.group_deadline_utc) {
            const d = new Date(data.group_deadline_utc);
            const localD = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
            setGroupDeadline(localD.toISOString().slice(0, 16));
          }
          if (data.criteria && data.criteria.length > 0) {
            setCriteria(data.criteria.map((c: any) => ({
              id: c.id,
              side: c.side,
              name: c.name,
              description: c.description,
              weight_pct: c.weight_pct,
            })));
          }
        })
        .catch((err: any) => setError(err.message || 'Failed to load assignment data'))
        .finally(() => setIsFetchingData(false));
    }
  }, [editAssignmentId]);

  // Compute live weight sums (US-ASSIGN-02)
  const groupWeightSum = criteria
    .filter((c) => c.side === 'GROUP')
    .reduce((sum, c) => sum + (Number(c.weight_pct) || 0), 0);

  const indivWeightSum = criteria
    .filter((c) => c.side === 'INDIVIDUAL')
    .reduce((sum, c) => sum + (Number(c.weight_pct) || 0), 0);

  const isGroupWeightValid = Math.abs(groupWeightSum - 100.0) < 0.01;
  const isIndivWeightValid = individualMaxScore === 0 || Math.abs(indivWeightSum - 100.0) < 0.01;

  const handleAddCriterion = (side: 'GROUP' | 'INDIVIDUAL') => {
    setCriteria([
      ...criteria,
      { side, name: '', description: '', weight_pct: 0 },
    ]);
  };

  const handleRemoveCriterion = (idx: number) => {
    setCriteria(criteria.filter((_, i) => i !== idx));
  };

  const handleCriterionChange = (idx: number, field: keyof CriterionInput, value: any) => {
    const updated = [...criteria];
    updated[idx] = { ...updated[idx], [field]: value };
    setCriteria(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGroupWeightValid) {
      setError(`ผลรวมน้ำหนักเกณฑ์ฝั่ง Group ต้องเท่ากับ 100% พอดี (ปัจจุบัน ${groupWeightSum}%)`);
      return;
    }
    if (!isIndivWeightValid) {
      setError(`ผลรวมน้ำหนักเกณฑ์ฝั่ง Individual ต้องเท่ากับ 100% พอดี (ปัจจุบัน ${indivWeightSum}%)`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        name,
        slug,
        description,
        artifact_url: artifactUrl,
        group_max_score: Number(groupMaxScore),
        individual_max_score: Number(individualMaxScore),
        group_deadline_utc: groupDeadline ? new Date(groupDeadline).toISOString() : null,
        individual_deadline_utc: groupDeadline ? new Date(groupDeadline).toISOString() : null,
        target_coverage: Number(targetCoverage),
        max_workload: Number(maxWorkload),
        criteria: criteria.map((c, i) => ({
          ...c,
          weight_pct: Number(c.weight_pct),
          display_order: i + 1,
        })),
      };

      if (editAssignmentId) {
        await fetchApi(`/assignments/${editAssignmentId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        window.alert('บันทึกการแก้ไขงานมอบหมายสำเร็จ');
        onSuccess(editAssignmentId);
      } else {
        const res = await fetchApi<any>(`/classrooms/${classroomId}/assignments`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        onSuccess(res.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save assignment');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingData) {
    return <div className="text-center py-20 text-slate-400">กำลังโหลดข้อมูลงานมอบหมาย...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4 mr-1" /> ย้อนกลับ
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">
          {editAssignmentId ? 'แก้ไขงานมอบหมายฉบับร่าง (Edit Draft)' : 'สร้างงานมอบหมายใหม่ (Create Assignment)'}
        </h1>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-sm">
        {/* Basic config */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">ชื่องานมอบหมาย (Assignment Name)</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
              }}
              placeholder="e.g. Final Deliverable & Peer Review"
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">URL Slug</label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="e.g. final-deliverable"
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700">คำอธิบายและข้อกำหนด (Description)</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="อธิบายวัตถุประสงค์และแนวทางการตรวจประเมิน"
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700">
            ลิงก์ผลงาน / Presentation / Deliverable Link (A5)
          </label>
          <input
            type="url"
            value={artifactUrl}
            onChange={(e) => setArtifactUrl(e.target.value)}
            placeholder="https://drive.google.com/... หรือ https://github.com/..."
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            * ลิงก์นี้จะปรากฏคู่กับทุกคำถามในการประเมิน เพื่อให้นักศึกษาเปิดดูผลงานจริงของเพื่อนได้ (A5)
          </p>
        </div>

        {/* Score & Deadline weights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700">คะแนนเต็มส่วนกลุ่ม (Group Max)</label>
            <input
              type="number"
              step="0.5"
              required
              value={groupMaxScore}
              onChange={(e) => setGroupMaxScore(Number(e.target.value))}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">คะแนนเต็มส่วนบุคคล (Indiv Max)</label>
            <input
              type="number"
              step="0.5"
              required
              value={individualMaxScore}
              onChange={(e) => setIndividualMaxScore(Number(e.target.value))}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            {individualMaxScore === 0 && (
              <p className="text-[11px] text-amber-600 mt-1">
                * ระบุ 0 เพื่อปิดการประเมินรายบุคคล (FR-ASSIGN-07)
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">กำหนดเวลาส่ง (Deadline)</label>
            <input
              type="datetime-local"
              value={groupDeadline}
              onChange={(e) => setGroupDeadline(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Criteria Builder with 100% check */}
        <div className="space-y-6 pt-6 border-t border-slate-200">
          {/* Group criteria */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900">เกณฑ์การประเมินระดับกลุ่ม (Group Criteria)</h3>
                <p className="text-xs text-slate-500">ผลรวมน้ำหนักต้องเท่ากับ 100% เสมอ (US-ASSIGN-02)</p>
              </div>

              {/* Weight badge */}
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  isGroupWeightValid
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {isGroupWeightValid ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <span>ผลรวม: {groupWeightSum}% / 100%</span>
              </div>
            </div>

            <div className="space-y-2">
              {criteria
                .map((c, idx) => ({ c, idx }))
                .filter(({ c }) => c.side === 'GROUP')
                .map(({ c, idx }) => (
                  <div key={idx} className="flex gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="ชื่อเกณฑ์ (e.g. UX)"
                        value={c.name}
                        onChange={(e) => handleCriterionChange(idx, 'name', e.target.value)}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="คำอธิบายเกณฑ์"
                        value={c.description}
                        onChange={(e) => handleCriterionChange(idx, 'description', e.target.value)}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="1"
                          required
                          placeholder="น้ำหนัก %"
                          value={c.weight_pct}
                          onChange={(e) => handleCriterionChange(idx, 'weight_pct', Number(e.target.value))}
                          className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                        <span className="text-xs text-slate-500">%</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCriterion(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
            </div>

            <Button type="button" variant="outline" size="sm" onClick={() => handleAddCriterion('GROUP')}>
              <Plus className="h-3.5 w-3.5 mr-1" /> เพิ่มเกณฑ์กลุ่ม
            </Button>
          </div>

          {/* Individual criteria (if individual_max_score > 0) */}
          {individualMaxScore > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-900">เกณฑ์การประเมินรายบุคคล (Individual Criteria)</h3>
                  <p className="text-xs text-slate-500">ผลรวมน้ำหนักต้องเท่ากับ 100% เสมอ</p>
                </div>

                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    isIndivWeightValid
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {isIndivWeightValid ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <span>ผลรวม: {indivWeightSum}% / 100%</span>
                </div>
              </div>

              <div className="space-y-2">
                {criteria
                  .map((c, idx) => ({ c, idx }))
                  .filter(({ c }) => c.side === 'INDIVIDUAL')
                  .map(({ c, idx }) => (
                    <div key={idx} className="flex gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          required
                          placeholder="ชื่อเกณฑ์ (e.g. Teamwork)"
                          value={c.name}
                          onChange={(e) => handleCriterionChange(idx, 'name', e.target.value)}
                          className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                        <input
                          type="text"
                          placeholder="คำอธิบายเกณฑ์"
                          value={c.description}
                          onChange={(e) => handleCriterionChange(idx, 'description', e.target.value)}
                          className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="1"
                            required
                            placeholder="น้ำหนัก %"
                            value={c.weight_pct}
                            onChange={(e) => handleCriterionChange(idx, 'weight_pct', Number(e.target.value))}
                            className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                          <span className="text-xs text-slate-500">%</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCriterion(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
              </div>

              <Button type="button" variant="outline" size="sm" onClick={() => handleAddCriterion('INDIVIDUAL')}>
                <Plus className="h-3.5 w-3.5 mr-1" /> เพิ่มเกณฑ์บุคคล
              </Button>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
          <Button variant="outline" type="button" onClick={onCancel}>
            ยกเลิก
          </Button>
          <Button
            variant="primary"
            type="submit"
            isLoading={isLoading}
            disabled={!isGroupWeightValid || !isIndivWeightValid}
          >
            {editAssignmentId ? 'บันทึกการแก้ไข (Save Changes)' : 'สร้างงานมอบหมายฉบับร่าง (Save Draft)'}
          </Button>
        </div>
      </form>
    </div>
  );
};
