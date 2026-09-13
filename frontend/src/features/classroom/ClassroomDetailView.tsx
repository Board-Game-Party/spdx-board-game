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
  ChevronRight, Calendar
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
  const { activeClassroom } = useAuth();
  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'assignments' | 'roster' | 'groups'>('assignments');
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // Add member form state
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'CO_TEACHER' | 'TA' | 'STUDENT'>('STUDENT');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberGroup, setNewMemberGroup] = useState('');

  const isInstructor = activeClassroom?.role === 'OWNER' || activeClassroom?.role === 'CO_TEACHER';
  const isTA = activeClassroom?.role === 'TA';

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
    } catch (err: any) {
      setError(err.message || 'Failed to load classroom details');
    } finally {
      setIsLoading(false);
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
          <h1 className="text-2xl font-bold text-slate-900">{classroom.name}</h1>
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
          {(isInstructor || isTA) && (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsRosterModalOpen(true)}>
                <Upload className="h-4 w-4 mr-1.5" />
                นำเข้า CSV Roster
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsAddMemberOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                เพิ่มสมาชิก
              </Button>
            </>
          )}

          {isInstructor && (
            <Button variant="primary" size="sm" onClick={onCreateAssignment}>
              <Plus className="h-4 w-4 mr-1.5" />
              สร้างงานมอบหมาย
            </Button>
          )}
        </div>
      </div>

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
                <Button variant="primary" size="sm" onClick={onCreateAssignment} className="mt-3">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classroom.members.map((m) => (
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
                  </tr>
                ))}
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
    </div>
  );
};
