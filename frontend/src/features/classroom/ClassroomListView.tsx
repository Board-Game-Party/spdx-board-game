import React, { useState, useEffect } from 'react';
import { useAuth } from '../../app/AuthContext';
import { fetchApi } from '../../lib/api';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Alert } from '../../components/Alert';
import { formatDate } from '../../lib/utils';
import { Plus, BookOpen, Users, Folder, ArrowRight, Archive } from 'lucide-react';

interface ClassroomSummary {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  status: string;
  role: string;
  member_count: number;
  group_count: number;
  created_at: string;
}

export interface ClassroomListViewProps {
  onSelectClassroom: (classroomId: string) => void;
}

export const ClassroomListView: React.FC<ClassroomListViewProps> = ({ onSelectClassroom }) => {
  const { user, setActiveClassroom, refreshProfile } = useAuth();
  const [classrooms, setClassrooms] = useState<ClassroomSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE');

  // Create modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [timezone, setTimezone] = useState('Asia/Bangkok');
  const [domains, setDomains] = useState('uni.ac.th');
  const [isCreating, setIsCreating] = useState(false);

  // Archive/unarchive confirmation modal state
  const [targetClassroom, setTargetClassroom] = useState<ClassroomSummary | null>(null);
  const [actionType, setActionType] = useState<'ARCHIVE' | 'UNARCHIVE' | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchClassrooms = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchApi<ClassroomSummary[]>(`/classrooms?status=${statusFilter}`);
      setClassrooms(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load classrooms');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, [statusFilter]);

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);
    try {
      const allowed_email_domains = domains
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);

      const res = await fetchApi<any>('/classrooms', {
        method: 'POST',
        body: JSON.stringify({ name, slug, timezone, allowed_email_domains }),
      });
      await refreshProfile();
      await fetchClassrooms();
      setIsModalOpen(false);
      setName('');
      setSlug('');
      onSelectClassroom(res.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create classroom');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEnterClassroom = (c: ClassroomSummary) => {
    const mem = user?.memberships.find((m) => m.classroom_id === c.id);
    if (mem) {
      setActiveClassroom({ ...mem, status: c.status });
    }
    onSelectClassroom(c.id);
  };

  const handleConfirmAction = async () => {
    if (!targetClassroom || !actionType) return;
    setIsActionLoading(true);
    setActionError(null);
    try {
      const newStatus = actionType === 'ARCHIVE' ? 'ARCHIVED' : 'ACTIVE';
      await fetchApi(`/classrooms/${targetClassroom.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      await refreshProfile();
      await fetchClassrooms();
      setTargetClassroom(null);
      setActionType(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update classroom status');
    } finally {
      setIsActionLoading(false);
    }
  };

  const canCreateClassroom =
    !user?.memberships.length ||
    user.memberships.some((m) => m.role === 'OWNER');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ห้องเรียนทั้งหมด (Classrooms)</h1>
          <p className="text-sm text-slate-500 mt-1">
            เลือกห้องเรียนเพื่อจัดการงานมอบหมาย รายชื่อนักศึกษา และแบบประเมิน
          </p>
        </div>

        {canCreateClassroom && (
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            สร้างห้องเรียนใหม่
          </Button>
        )}
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Status Filter Tabs */}
      <div className="border-b border-slate-200 flex gap-6">
        <button
          type="button"
          onClick={() => setStatusFilter('ACTIVE')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            statusFilter === 'ACTIVE'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          ห้องเรียนปัจจุบัน (Active)
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('ARCHIVED')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            statusFilter === 'ARCHIVED'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Archive className="h-4 w-4" />
          คลังจัดเก็บ (Archived)
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400">กำลังโหลดรายการห้องเรียน...</div>
      ) : classrooms.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-2xl p-8 space-y-3">
          {statusFilter === 'ARCHIVED' ? (
            <Archive className="h-10 w-10 mx-auto text-slate-400" />
          ) : (
            <BookOpen className="h-10 w-10 mx-auto text-slate-400" />
          )}
          <h3 className="text-base font-semibold text-slate-700">
            {statusFilter === 'ARCHIVED' ? 'ไม่มีห้องเรียนในคลังจัดเก็บ' : 'ยังไม่มีห้องเรียนในระบบ'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {statusFilter === 'ARCHIVED'
              ? 'ห้องเรียนที่ถูกจัดเก็บจะแสดงที่นี่'
              : canCreateClassroom
              ? 'กดปุ่ม "สร้างห้องเรียนใหม่" ด้านบนเพื่อเริ่มตั้งค่าห้องเรียน นำเข้ารายชื่อนักศึกษา และสร้างงานมอบหมาย'
              : 'คุณยังไม่ได้รับการเพิ่มเข้าห้องเรียนใดๆ กรุณาติดต่ออาจารย์ผู้สอน'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classrooms.map((c) => (
            <div
              key={c.id}
              onClick={() => handleEnterClassroom(c)}
              className="bg-white border border-slate-200 hover:border-brand-500/50 hover:shadow-lg rounded-2xl p-5 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-brand-50 text-brand-700">
                      {c.role}
                    </span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${c.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      {c.status}
                    </span>
                  </div>

                  {(c.role === 'OWNER' || c.role === 'CO_TEACHER') && (
                    c.status === 'ARCHIVED' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetClassroom(c);
                          setActionType('UNARCHIVE');
                          setActionError(null);
                        }}
                        className="text-xs py-1 px-2.5 h-auto"
                      >
                        กู้คืน
                      </Button>
                    ) : (statusFilter === 'ACTIVE' || c.status === 'ACTIVE') ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetClassroom(c);
                          setActionType('ARCHIVE');
                          setActionError(null);
                        }}
                        className="text-xs py-1 px-2.5 h-auto text-slate-600 hover:text-rose-600 hover:border-rose-300"
                      >
                        จัดเก็บ
                      </Button>
                    ) : null
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                    {c.name}
                  </h3>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">/{c.slug}</p>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-slate-400" />
                    {c.member_count} สมาชิก
                  </span>
                  <span className="flex items-center gap-1">
                    <Folder className="h-4 w-4 text-slate-400" />
                    {c.group_count} กลุ่ม
                  </span>
                </div>
              </div>

              <div className="pt-4 mt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-50">
                <span>สร้างเมื่อ {formatDate(c.created_at)}</span>
                <span className="font-medium text-brand-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  เข้าสู่ห้องเรียน <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Classroom Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="สร้างห้องเรียนใหม่">
        <form onSubmit={handleCreateClassroom} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700">ชื่อห้องเรียน (Course Name)</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
              }}
              placeholder="e.g. Software Engineering 2026/1"
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Classroom Slug (URL Identifier)</label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="e.g. se-2026-1"
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Timezone</label>
            <input
              type="text"
              required
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Allowed Email Domains (คั่นด้วย comma)
            </label>
            <input
              type="text"
              value={domains}
              onChange={(e) => setDomains(e.target.value)}
              placeholder="uni.ac.th, student.uni.ac.th"
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              * จำกัดการเข้าสู่ระบบเฉพาะอีเมลภายใต้โดเมนเหล่านี้ (US-AUTH-02)
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="primary" type="submit" isLoading={isCreating}>
              สร้างห้องเรียน
            </Button>
          </div>
        </form>
      </Modal>

      {/* Archive / Unarchive Confirmation Modal */}
      <Modal
        isOpen={Boolean(targetClassroom && actionType)}
        onClose={() => {
          if (!isActionLoading) {
            setTargetClassroom(null);
            setActionType(null);
            setActionError(null);
          }
        }}
        title={actionType === 'ARCHIVE' ? 'ยืนยันการจัดเก็บห้องเรียน' : 'ยืนยันการกู้คืนห้องเรียน'}
      >
        {targetClassroom && (
          <div className="space-y-4 text-sm">
            {actionError && <Alert type="error">{actionError}</Alert>}

            <p className="text-slate-700">
              {actionType === 'ARCHIVE' ? (
                <>
                  คุณแน่ใจหรือไม่ว่าต้องการจัดเก็บห้องเรียน{' '}
                  <span className="font-semibold text-slate-900">{targetClassroom.name}</span>?
                  เมื่อจัดเก็บแล้ว ห้องเรียนจะเปลี่ยนสถานะเป็นโหมดอ่านอย่างเดียว (Archived / Read-only)
                </>
              ) : (
                <>
                  คุณแน่ใจหรือไม่ว่าต้องการกู้คืนห้องเรียน{' '}
                  <span className="font-semibold text-slate-900">{targetClassroom.name}</span>?
                  ห้องเรียนจะกลับมาเปิดใช้งานอีกครั้ง (Active)
                </>
              )}
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setTargetClassroom(null);
                  setActionType(null);
                  setActionError(null);
                }}
                disabled={isActionLoading}
              >
                ยกเลิก
              </Button>
              <Button
                variant={actionType === 'ARCHIVE' ? 'danger' : 'primary'}
                type="button"
                onClick={handleConfirmAction}
                isLoading={isActionLoading}
              >
                {actionType === 'ARCHIVE' ? 'ยืนยันการจัดเก็บ' : 'ยืนยันการกู้คืน'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
