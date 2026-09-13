import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import { Button } from '../../components/Button';
import { Alert } from '../../components/Alert';
import { formatDate } from '../../lib/utils';
import { ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';

interface AuditEvent {
  id: string;
  classroom_id?: string;
  assignment_id?: string;
  actor_user_id: string;
  actor_name: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  before_json?: Record<string, any>;
  after_json?: Record<string, any>;
  reason?: string;
  ip_address?: string;
  occurred_at: string;
}

export interface AuditTrailViewProps {
  classroomId: string;
  onBack: () => void;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ classroomId, onBack }) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAudit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchApi<AuditEvent[]>(`/classrooms/${classroomId}/audit`);
      setEvents(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit trail');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, [classroomId]);

  if (isLoading) {
    return <div className="text-center py-20 text-slate-400">กำลังโหลดบันทึก Audit Trail...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button onClick={onBack} className="text-xs text-brand-600 font-medium hover:underline flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> กลับหน้าห้องเรียน
          </button>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            Append-Only Audit Trail Log
          </h1>
          <p className="text-xs text-slate-500">
            บันทึกการกระทำสำคัญทุกอย่างในห้องเรียน (AR-03: ไม่สามารถลบหรือแก้ไขประวัติได้)
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadAudit}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> รีเฟรช
        </Button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">เวลาที่เกิด (UTC+7)</th>
                <th className="px-4 py-3 text-left">ผู้กระทำ (Actor)</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">Resource</th>
                <th className="px-4 py-3 text-left">เหตุผลประกอบ (Reason)</th>
                <th className="px-4 py-3 text-left">Before &rarr; After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {events.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {formatDate(e.occurred_at)}
                  </td>
                  <td className="px-4 py-3 font-sans font-semibold text-slate-900">
                    {e.actor_name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold">
                      {e.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {e.resource_type} {e.resource_id ? `(${e.resource_id.slice(0, 8)}...)` : ''}
                  </td>
                  <td className="px-4 py-3 font-sans text-slate-700 max-w-xs truncate">
                    {e.reason || '-'}
                  </td>
                  <td className="px-4 py-3 text-[10px] text-slate-500 max-w-xs truncate">
                    {e.before_json || e.after_json ? JSON.stringify({ before: e.before_json, after: e.after_json }) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
