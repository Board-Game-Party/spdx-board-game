import React, { useState, useEffect } from 'react';
import { useAuth } from '../../app/AuthContext';
import { fetchApi } from '../../lib/api';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Alert } from '../../components/Alert';
import { RosterImportModal } from './RosterImportModal';
import { formatDate } from '../../lib/utils';
import {
  Users, Plus, Upload, BookOpen, Layers,
  ChevronRight, Calendar, Archive, ArchiveRestore, Trash2
} from 'lucide-react';

interface ClassroomMemberOut {
  id: string;
  user_id: string;
  email_raw: string;
  display_name?: string;
  role: string;
  group_name?: string;
  student_id?: string;
  user_status: string;
  joined_at: string;
}

interface GroupSummary {
  id: string;
  name: string;
  member_count: number;
}

interface ClassroomDetail {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  allowed_email_domains: string[];
  status: string;
  created_by: string;
  created_at: string;
  members: ClassroomMemberOut[];
  groups: GroupSummary[];
}

interface AssignmentSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  group_max_score: number;
  individual_max_score: number;
  group_deadline_utc?: string;
  created_at: string;
}

export interface ClassroomDetailViewProps {
  classroomId: string;
  onSelectAssignment: (assignmentId: string) => void;
  onCreateAssignment: () => void;
  onBack: () => void;
}

export const ClassroomDetailView: React.FC<ClassroomDetailViewProps> = ({
  classroomId,
  onSelectAssignment,
  onCreateAssignment,
  onBack,
}) => {
  const { activeClassroom, setActiveClassroom, refreshProfile } = useAuth();
  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Archive state
  const [isConfirmArchiveOpen, setIsConfirmArchiveOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  // Delete classroom state
  const [isConfirmDeleteClassroomOpen, setIsConfirmDeleteClassroomOpen] = useState(false);
  const [isDeletingClassroom, setIsDeletingClassroom] = useState(false);
  const [deleteClassroomError, setDeleteClassroomError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'assignments' | 'roster' | 'groups'>('assignments');
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // Add member form state
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'CO_TEACHER' | 'TA' | 'STUDENT'>('STUDENT');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberGroup, setNewMemberGroup] = useState('');

  // Edit member state
  const [editingMember, setEditingMember] = useState<ClassroomMemberOut | null>(null);
  const [editRole, setEditRole] = useState<string>('STUDENT');
  const [editGroupName, setEditGroupName] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete member state
  const [deletingMember, setDeletingMember] = useState<ClassroomMemberOut | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isInstructor = activeClassroom?.role === 'OWNER' || activeClassroom?.role === 'CO_TEACHER';
  const isOwner = activeClassroom?.role === 'OWNER';
  const isTA = activeClassroom?.role === 'TA';
  const classroomStatus = activeClassroom?.status || classroom?.status || 'ACTIVE';
  const isArchived = classroomStatus === 'ARCHIVED';

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [cRes, aRes] = await Promise.all([
        fetchApi<ClassroomDetail>(`/classrooms/${classroomId}`),
        fetchApi<AssignmentSummary[]>(`/classrooms/${classroomId}/assignments`),
      ]);
      setClassroom(cRes);
      setAssignments(aRes);
      if (activeClassroom && activeClassroom.classroom_id === classroomId && activeClassroom.status !== cRes.status) {
        setActiveClassroom({ ...activeClassroom, status: cRes.status });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load classroom details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!classroom) return;
    setIsArchiving(true);
    setArchiveError(null);
    try {
      const newStatus = isArchived ? 'ACTIVE' : 'ARCHIVED';
      await fetchApi(`/classrooms/${classroom.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (activeClassroom) {
        setActiveClassroom({ ...activeClassroom, status: newStatus });
      }
      await refreshProfile();
      await loadData();
      setIsConfirmArchiveOpen(false);
    } catch (err: any) {
      setArchiveError(err.message || 'Failed to update classroom status');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDeleteClassroom = async () => {
    if (!classroom) return;
    setIsDeletingClassroom(true);
    setDeleteClassroomError(null);
    try {
      await fetchApi('/classrooms/' + classroom.id, { method: 'DELETE' });
      await refreshProfile();
      onBack();
    } catch (err: any) {
      setDeleteClassroomError(err.message || 'Failed to delete classroom');
      setIsDeletingClassroom(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [classroomId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi(`/classrooms/${classroomId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          email: newMemberEmail,
          role: newMemberRole,
          display_name: newMemberName || undefined,
          group_name: newMemberGroup || undefined,
        }),
      });
      setIsAddMemberOpen(false);
      setNewMemberEmail('');
      setNewMemberName('');
      setNewMemberGroup('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    }
  };

  const handleOpenEdit = (m: ClassroomMemberOut) => {
    setEditingMember(m);
    setEditRole(m.role);
    setEditGroupName(m.group_name || '');
    setEditStudentId(m.student_id || '');
    setEditError(null);
  };

  const handleEditMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setIsSubmittingEdit(true);
    setEditError(null);
    try {
      await fetchApi(`/classrooms/${classroomId}/members/${editingMember.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          role: editRole,
          group_name: editGroupName,
          student_id: editStudentId,
        }),
      });
      setEditingMember(null);
      await loadData();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update member');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteMemberSubmit = async () => {
    if (!deletingMember) return;
    setIsSubmittingDelete(true);
    setDeleteError(null);
    try {
      await fetchApi(`/classrooms/${classroomId}/members/${deletingMember.id}`, {
        method: 'DELETE',
      });
      setDeletingMember(null);
      await loadData();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete member');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-20 text-slate-400">กำลังโหลดข้อมูลห้องเรียน...</div>;
  }

  if (!classroom) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Alert type="error">{error || 'ไม่พบห้องเรียน'}</Alert>
        <Button variant="outline" onClick={onBack} className="mt-4">
          ย้อนกลับ
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-xs text-brand-600 font-medium hover:underline">
              &larr; ห้องเรียนทั้งหมด
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-mono text-slate-500">{classroom.slug}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{classroom.name}</h1>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                classroomStatus === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {classroomStatus}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
            <span>Timezone: {classroom.timezone}</span>
            <span>&bull;</span>
            <span>
              Allowed Domains: {classroom.allowed_email_domains.join(', ') || 'Any'}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isInstructor && (
            isArchived ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmArchiveOpen(true)}
              >
                <ArchiveRestore className="h-4 w-4 mr-1.5" />
                กู้คืนห้องเรียน
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmArchiveOpen(true)}
                className="text-slate-600 hover:text-rose-600"
              >
                <Archive className="h-4 w-4 mr-1.5" />
                จัดเก็บห้องเรียน
              </Button>
            )
          )}

          {(isInstructor || isTA) && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRosterModalOpen(true)}
                disabled={isArchived}
                title={isArchived ? 'ห้องเรียนถูกจัดเก็บแล้ว (Read-only)' : undefined}
              >
                <Upload className="h-4 w-4 mr-1.5" />
                นำเข้า CSV Roster
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddMemberOpen(true)}
                disabled={isArchived}
                title={isArchived ? 'ห้องเรียนถูกจัดเก็บแล้ว (Read-only)' : undefined}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                เพิ่มสมาชิก
              </Button>
            </>
          )}

          {isInstructor && (
            <Button
              variant="primary"
              size="sm"
              onClick={onCreateAssignment}
              disabled={isArchived}
              title={isArchived ? 'ห้องเรียนถูกจัดเก็บแล้ว (Read-only)' : undefined}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              สร้างงานมอบหมาย
            </Button>
          )}

          {isOwner && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsConfirmDeleteClassroomOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              ลบห้องเรียน
            </Button>
          )}
        </div>
      </div>

      {isArchived && (
        <Alert type="warning">
          ⚠️ ห้องเรียนนี้ถูกจัดเก็บแล้ว (Archived / Read-only)
        </Alert>
      )}

      {error && <Alert type="error">{error}</Alert>}

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-6">
        <button
          onClick={() => setActiveTab('assignments')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'assignments'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          งานมอบหมาย ({assignments.length})
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'roster'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="h-4 w-4" />
          รายชื่อสมาชิก ({classroom.members.length})
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'groups'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="h-4 w-4" />
          กลุ่มทั้งหมด ({classroom.groups.length})
        </button>
      </div>

      {/* Tab content: Assignments */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl p-6">
              <BookOpen className="h-8 w-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-700">ยังไม่มีงานมอบหมายในห้องเรียนนี้</p>
              {isInstructor && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onCreateAssignment}
                  className="mt-3"
                  disabled={isArchived}
                  title={isArchived ? 'ห้องเรียนถูกจัดเก็บแล้ว (Read-only)' : undefined}
                >
                  สร้างงานมอบหมายแรก
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  onClick={() => onSelectAssignment(a.id)}
                  className="bg-white border border-slate-200 hover:border-brand-400 hover:shadow-md rounded-xl p-5 cursor-pointer transition-all flex justify-between items-center group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          a.status === 'OPEN'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : a.status === 'FINALIZED'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : a.status === 'PUBLISHED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {a.status}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">/{a.slug}</span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900 group-hover:text-brand-600 transition-colors">
                      {a.name}
                    </h3>

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>คะแนนเต็ม: {a.group_max_score + a.individual_max_score} คะแนน</span>
                      {a.group_deadline_utc && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {formatDate(a.group_deadline_utc, classroom.timezone)}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab content: Roster */}
      {activeTab === 'roster' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">รหัสนักศึกษา</th>
                  <th className="px-4 py-3 text-left">ชื่อ / อีเมล</th>
                  <th className="px-4 py-3 text-left">กลุ่ม (Group)</th>
                  <th className="px-4 py-3 text-left">บทบาท (Role)</th>
                  <th className="px-4 py-3 text-left">สถานะบัญชี</th>
                  {isInstructor && <th className="px-4 py-3 text-right">จัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classroom.members.map((m) => {
                  const ownerCount = classroom.members.filter((mem) => mem.role === 'OWNER').length;
                  const isTargetOwner = m.role === 'OWNER';
                  const isCallerCoTeacher = activeClassroom?.role === 'CO_TEACHER';
                  const cannotModify = isCallerCoTeacher && isTargetOwner;
                  const isSoleOwner = isTargetOwner && ownerCount <= 1;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-slate-600 text-xs">{m.student_id || '-'}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{m.display_name || m.email_raw}</p>
                        <p className="text-xs text-slate-400 font-mono">{m.email_raw}</p>
                      </td>
                      <td className="px-4 py-3">
                        {m.group_name ? (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-medium">
                            {m.group_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {m.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className={m.user_status === 'ACTIVE' ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                          {m.user_status}
                        </span>
                      </td>
                      {isInstructor && (
                        <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isArchived || cannotModify}
                            onClick={() => handleOpenEdit(m)}
                            title={isArchived ? 'ห้องเรียนถูกจัดเก็บแล้ว (Read-only)' : cannotModify ? 'Co-Teacher ไม่สามารถแก้ไข Owner ได้' : undefined}
                          >
                            แก้ไข
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={isArchived || cannotModify || isSoleOwner}
                            onClick={() => {
                              setDeletingMember(m);
                              setDeleteError(null);
                            }}
                            title={isArchived ? 'ห้องเรียนถูกจัดเก็บแล้ว (Read-only)' : cannotModify ? 'Co-Teacher ไม่สามารถลบ Owner ได้' : isSoleOwner ? 'ไม่สามารถลบ Owner คนสุดท้ายได้' : undefined}
                          >
                            ลบ
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab content: Groups */}
      {activeTab === 'groups' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {classroom.groups.map((g) => (
            <div key={g.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-900">{g.name}</h4>
                <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-semibold">
                  {g.member_count} คน
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {g.member_count < 2 ? (
                  <span className="text-rose-600 font-medium">⚠️ สมาชิกน้อยกว่า 2 คน</span>
                ) : (
                  'พร้อมสำหรับการเปรียบเทียบคู่'
                )}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Roster Import Modal */}
      <RosterImportModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        classroomId={classroom.id}
        onSuccess={loadData}
      />

      {/* Add Member Modal */}
      <Modal isOpen={isAddMemberOpen} onClose={() => setIsAddMemberOpen(false)} title="เพิ่มสมาชิกในห้องเรียน">
        <form onSubmit={handleAddMember} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700">อีเมล (University Email)</label>
            <input
              type="email"
              required
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="student@uni.ac.th"
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">บทบาท (Role)</label>
            <select
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value as any)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="STUDENT">Student (นักศึกษา)</option>
              <option value="TA">Teaching Assistant (TA)</option>
              <option value="CO_TEACHER">Co-Teacher (อาจารย์ร่วมสอน)</option>
            </select>
          </div>

          {newMemberRole === 'STUDENT' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700">ชื่อกลุ่ม (Group Name)</label>
              <input
                type="text"
                value={newMemberGroup}
                onChange={(e) => setNewMemberGroup(e.target.value)}
                placeholder="e.g. Group Alpha"
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700">ชื่อ-นามสกุล (ทางเลือก)</label>
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="ชื่อแสดงในระบบ"
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsAddMemberOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="primary" type="submit">
              บันทึกสมาชิก
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Member Modal */}
      <Modal
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        title="แก้ไขข้อมูลสมาชิก"
      >
        {editingMember && (
          <form onSubmit={handleEditMemberSubmit} className="space-y-4 text-sm">
            {editError && <Alert type="error">{editError}</Alert>}

            <div>
              <label className="block text-xs font-semibold text-slate-700">อีเมล</label>
              <input
                type="text"
                disabled
                value={editingMember.email_raw}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg text-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">รหัสนักศึกษา (Student ID)</label>
              <input
                type="text"
                value={editStudentId}
                onChange={(e) => setEditStudentId(e.target.value)}
                placeholder="เช่น 64010001"
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">บทบาท (Role)</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="STUDENT">Student (นักศึกษา)</option>
                <option value="TA">Teaching Assistant (TA)</option>
                <option value="CO_TEACHER">Co-Teacher (อาจารย์ร่วมสอน)</option>
                <option value="OWNER">Owner (เจ้าของห้องเรียน)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">ชื่อกลุ่ม (Group Name)</label>
              <input
                type="text"
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
                placeholder="เช่น Group Alpha (เว้นว่างหากไม่มีกลุ่ม)"
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <p className="text-xs text-slate-400 mt-1">เว้นว่างเพื่อยกเลิกการจัดกลุ่ม</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                type="button"
                onClick={() => setEditingMember(null)}
                disabled={isSubmittingEdit}
              >
                ยกเลิก
              </Button>
              <Button variant="primary" type="submit" isLoading={isSubmittingEdit}>
                บันทึกการแก้ไข
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Member Confirmation Modal */}
      <Modal
        isOpen={!!deletingMember}
        onClose={() => setDeletingMember(null)}
        title="ยืนยันการลบสมาชิก"
      >
        {deletingMember && (
          <div className="space-y-4 text-sm">
            {deleteError && <Alert type="error">{deleteError}</Alert>}

            <p className="text-slate-700">
              คุณแน่ใจหรือไม่ว่าต้องการลบ{' '}
              <span className="font-semibold text-slate-900">
                {deletingMember.display_name || deletingMember.email_raw}
              </span>{' '}
              ({deletingMember.role}) ออกจากห้องเรียนนี้?
            </p>
            <p className="text-xs text-slate-500">
              การกระทำนี้จะนำสมาชิกออกจากห้องเรียน ข้อมูลการประเมินที่เกี่ยวข้องอาจได้รับผลกระทบ
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                type="button"
                onClick={() => setDeletingMember(null)}
                disabled={isSubmittingDelete}
              >
                ยกเลิก
              </Button>
              <Button
                variant="danger"
                type="button"
                onClick={handleDeleteMemberSubmit}
                isLoading={isSubmittingDelete}
              >
                ยืนยันการลบ
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Archive / Unarchive Confirmation Modal */}
      <Modal
        isOpen={isConfirmArchiveOpen}
        onClose={() => {
          if (!isArchiving) {
            setIsConfirmArchiveOpen(false);
            setArchiveError(null);
          }
        }}
        title={isArchived ? 'ยืนยันการกู้คืนห้องเรียน' : 'ยืนยันการจัดเก็บห้องเรียน'}
      >
        <div className="space-y-4 text-sm">
          {archiveError && <Alert type="error">{archiveError}</Alert>}

          <p className="text-slate-700">
            {isArchived ? (
              <>
                คุณแน่ใจหรือไม่ว่าต้องการกู้คืนห้องเรียน{' '}
                <span className="font-semibold text-slate-900">{classroom.name}</span>?
                ห้องเรียนจะกลับมาเปิดใช้งานอีกครั้ง (Active)
              </>
            ) : (
              <>
                คุณแน่ใจหรือไม่ว่าต้องการจัดเก็บห้องเรียน{' '}
                <span className="font-semibold text-slate-900">{classroom.name}</span>?
                เมื่อจัดเก็บแล้ว ห้องเรียนจะเปลี่ยนเป็นโหมดอ่านอย่างเดียว (Archived / Read-only)
              </>
            )}
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setIsConfirmArchiveOpen(false);
                setArchiveError(null);
              }}
              disabled={isArchiving}
            >
              ยกเลิก
            </Button>
            <Button
              variant={isArchived ? 'primary' : 'danger'}
              type="button"
              onClick={handleToggleArchive}
              isLoading={isArchiving}
            >
              {isArchived ? 'ยืนยันการกู้คืน' : 'ยืนยันการจัดเก็บ'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Classroom Confirmation Modal */}
      <Modal
        isOpen={isConfirmDeleteClassroomOpen}
        onClose={() => {
          if (!isDeletingClassroom) {
            setIsConfirmDeleteClassroomOpen(false);
            setDeleteClassroomError(null);
          }
        }}
        title="ยืนยันการลบห้องเรียนถาวร"
      >
        <div className="space-y-4 text-sm">
          {deleteClassroomError && <Alert type="error">{deleteClassroomError}</Alert>}

          <p className="text-slate-700">
            คุณแน่ใจหรือไม่ว่าต้องการลบห้องเรียน{' '}
            <span className="font-semibold text-slate-900">{classroom.name}</span> ถาวร?
          </p>

          <Alert type="error">
            ⚠️ <strong>คำเตือน:</strong> การกระทำนี้ไม่สามารถย้อนกลับได้ ข้อมูลงานมอบหมายทั้งหมด (Assignments), ผลคะแนน (Scores), กลุ่ม (Groups) และรายชื่อผู้เรียน (Roster) ในห้องเรียนนี้จะถูกลบออกอย่างถาวร
          </Alert>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setIsConfirmDeleteClassroomOpen(false);
                setDeleteClassroomError(null);
              }}
              disabled={isDeletingClassroom}
            >
              ยกเลิก
            </Button>
            <Button
              variant="danger"
              type="button"
              onClick={handleDeleteClassroom}
              isLoading={isDeletingClassroom}
            >
              ยืนยันการลบห้องเรียน
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
