import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import { Button } from '../../components/Button';
import { Alert } from '../../components/Alert';
import { ArrowLeft, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

interface QualitySignalItem {
  signal_id: string;
  signal_name: string;
  severity: 'INFO' | 'WARNING' | 'ALERT';
  affected_entity_type: string;
  affected_entity_id: string;
  affected_entity_name: string;
  metric_value: number;
  threshold_value: number;
  details: string;
  recommended_action: string;
}

interface QualityReportResponse {
  assignment_id: string;
  total_comparisons: number;
  submitted_comparisons: number;
  signals: QualitySignalItem[];
  has_anomalies: boolean;
  summary: string;
}

export interface QualityReportViewProps {
  assignmentId: string;
  onBack: () => void;
}

export const QualityReportView: React.FC<QualityReportViewProps> = ({ assignmentId, onBack }) => {
  const [report, setReport] = useState<QualityReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchApi<QualityReportResponse>(`/assignments/${assignmentId}/reports/quality`);
      setReport(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load quality report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [assignmentId]);

  if (isLoading) {
    return <div className="text-center py-20 text-slate-400">กำลังตรวจจับสัญญาณคุณภาพและความผิดปกติ...</div>;
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
          <h1 className="text-2xl font-bold text-slate-900">Quality Signals &amp; Integrity Report</h1>
          <p className="text-xs text-slate-500">
            ระบบตรวจจับพฤติกรรมการตอบผิดปกติ (QS-01..07) เพื่อให้อาจารย์ตรวจสอบด้วยตา (ระบบไม่ตัดคะแนนอัตโนมัติ FR-QS-01)
          </p>
        </div>
      </div>

      {/* Summary card */}
      <div
        className={`p-5 rounded-2xl border text-sm flex items-center justify-between ${
          report.has_anomalies
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}
      >
        <div className="flex items-center gap-3">
          {report.has_anomalies ? (
            <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
          ) : (
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
          )}
          <div>
            <h4 className="font-bold">{report.summary}</h4>
            <p className="text-xs mt-0.5">
              ส่งผลประเมินแล้ว {report.submitted_comparisons} / {report.total_comparisons} ข้อ
            </p>
          </div>
        </div>
      </div>

      {report.signals.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-6">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
          <h3 className="font-bold text-slate-800">ไม่พบความผิดปกติ</h3>
          <p className="text-xs text-slate-500">
            ผลการประเมินมีความสอดคล้องเชิงตรรกะ และไม่มีพฤติกรรม Straight-lining หรือ Speed running
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.signals.map((sig, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-2xl border bg-white shadow-xs space-y-3 ${
                sig.severity === 'ALERT'
                  ? 'border-rose-300'
                  : sig.severity === 'WARNING'
                  ? 'border-amber-300'
                  : 'border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      sig.severity === 'ALERT'
                        ? 'bg-rose-100 text-rose-800'
                        : sig.severity === 'WARNING'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {sig.signal_id} &middot; {sig.signal_name}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">[{sig.affected_entity_type}]</span>
                </div>
                <span className="font-mono text-xs font-bold text-slate-700">
                  {sig.metric_value} (เกณฑ์ {sig.threshold_value})
                </span>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm">{sig.affected_entity_name}</h4>
                <p className="text-xs text-slate-600 mt-1">{sig.details}</p>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 flex items-start gap-2">
                <Info className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
                <span>
                  <strong>ข้อแนะนำ:</strong> {sig.recommended_action}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
