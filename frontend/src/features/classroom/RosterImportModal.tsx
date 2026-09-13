import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Alert } from '../../components/Alert';
import { fetchApi } from '../../lib/api';

interface RosterImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomId: string;
  onSuccess: () => void;
}

interface RosterDiffItem {
  email: string;
  student_id?: string;
  display_name?: string;
  old_group?: string;
  new_group?: string;
  action: 'ADDED' | 'UPDATED' | 'UNCHANGED' | 'REMOVED';
}

interface ImportResult {
  success: boolean;
  mode: string;
  dry_run: boolean;
  total_rows: number;
  imported_students: number;
  groups_created: number;
  warnings: string[];
  diffs: RosterDiffItem[];
}

export const RosterImportModal: React.FC<RosterImportModalProps> = ({
  isOpen,
  onClose,
  classroomId,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'UPSERT' | 'REPLACE'>('UPSERT');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diffResult, setDiffResult] = useState<ImportResult | null>(null);

  const handlePreview = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', mode);
      formData.append('dry_run', 'true');

      const res = await fetchApi<ImportResult>(`/classrooms/${classroomId}/roster:import`, {
        method: 'POST',
        body: formData,
      });
      setDiffResult(res);
    } catch (err: any) {
      setError(err.message || 'CSV Import preview failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', mode);
      formData.append('dry_run', 'false');

      await fetchApi(`/classrooms/${classroomId}/roster:import`, {
        method: 'POST',
        body: formData,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'CSV Import failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="นำเข้ารายชื่อนักศึกษาผ่าน CSV (Atomic Import)" maxWidth="xl">
      <div className="space-y-4 text-sm">
        {error && <Alert type="error">{error}</Alert>}

        {/* Format guide */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800">รูปแบบหัวตาราง CSV ที่ระบบรองรับ:</p>
          <code className="block p-2 bg-slate-100 rounded text-slate-900 font-mono">
            email,group_name,student_id,display_name
          </code>
          <p className="text-[11px] text-slate-500">
            * ขนาดกลุ่มต้องมีสมาชิกอย่างน้อย 2 คน · ระบบตรวจจับและป้องกัน Formula Injection อัตโนมัติ (FR-SEC-04)
          </p>
        </div>

        {/* File input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">เลือกไฟล์ CSV</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setDiffResult(null);
            }}
            className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
          />
        </div>

        {/* Mode selector */}
        <div className="flex gap-4 items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={mode === 'UPSERT'}
              onChange={() => setMode('UPSERT')}
              className="text-brand-600 focus:ring-brand-500"
            />
            <span>UPSERT (อัปเดตกลุ่มโดยเก็บข้อมูลเดิมไว้)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={mode === 'REPLACE'}
              onChange={() => setMode('REPLACE')}
              className="text-brand-600 focus:ring-brand-500"
            />
            <span>REPLACE (แทนที่รายชื่อทั้งหมด)</span>
          </label>
        </div>

        {/* Diff view preview (US-CLASS-03) */}
        {diffResult && (
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wide">
                ตัวอย่างผลการเปลี่ยนแปลง (Diff Preview)
              </h4>
              <span className="text-xs bg-brand-100 text-brand-800 px-2 py-0.5 rounded-full font-medium">
                รวม {diffResult.total_rows} แถว
              </span>
            </div>

            {diffResult.warnings.length > 0 && (
              <Alert type="warning" title="คำแนะนำ">
                <ul className="list-disc pl-4 space-y-0.5 text-xs">
                  {diffResult.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </Alert>
            )}

            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg bg-white">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">อีเมล</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">กลุ่มเดิม &rarr; กลุ่มใหม่</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {diffResult.diffs.map((d, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-3 py-1.5 font-mono text-slate-700">{d.email}</td>
                      <td className="px-3 py-1.5">
                        {d.old_group ? `${d.old_group} → ${d.new_group || '(ลบ)'}` : d.new_group}
                      </td>
                      <td className="px-3 py-1.5 font-semibold">
                        <span
                          className={
                            d.action === 'ADDED'
                              ? 'text-emerald-600'
                              : d.action === 'UPDATED'
                              ? 'text-amber-600'
                              : d.action === 'REMOVED'
                              ? 'text-rose-600'
                              : 'text-slate-400'
                          }
                        >
                          {d.action}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>

          {!diffResult ? (
            <Button
              variant="secondary"
              onClick={handlePreview}
              isLoading={isLoading}
              disabled={!file}
            >
              ตรวจสอบความถูกต้อง (Dry Run Preview)
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleConfirmImport}
              isLoading={isLoading}
            >
              ยืนยันนำเข้าข้อมูลจริง
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
