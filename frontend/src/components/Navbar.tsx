import React, { useState } from 'react';
import { useAuth } from '../app/AuthContext';
import { Bell, LogOut, Layers } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { Modal } from './Modal';
import { Button } from './Button';

export interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, activeClassroom, setActiveClassroom, notifications, unreadNotificationCount, markNotificationRead, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const isInstructor = activeClassroom?.role === 'OWNER' || activeClassroom?.role === 'CO_TEACHER';
  const isTA = activeClassroom?.role === 'TA';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Nav links */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => onNavigate('classrooms')}
              className="flex items-center gap-2 text-brand-700 font-bold text-xl tracking-tight focus:outline-none"
            >
              <span className="p-1.5 bg-brand-50 text-brand-600 rounded-lg">
                <Layers className="h-6 w-6" />
              </span>
              <span>PairEval</span>
            </button>

            {/* Navigation tabs */}
            {activeClassroom && (
              <nav className="hidden md:flex gap-1">
                <button
                  onClick={() => onNavigate('classroom-detail')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'classroom-detail'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  ห้องเรียน ({activeClassroom.classroom_name})
                </button>

                {(isInstructor || isTA) && (
                  <button
                    onClick={() => onNavigate('audit-trail')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentView === 'audit-trail'
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Audit Trail
                  </button>
                )}
              </nav>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Classroom switcher */}
            {user && user.memberships.length > 1 && (
              <select
                value={activeClassroom?.id || ''}
                onChange={(e) => {
                  const selected = user.memberships.find(m => m.id === e.target.value);
                  if (selected) setActiveClassroom(selected);
                }}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:ring-1 focus:ring-brand-500"
              >
                {user.memberships.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.classroom_name} ({m.role})
                  </option>
                ))}
              </select>
            )}

            {/* Role badge */}
            {activeClassroom && (
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  isInstructor
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : isTA
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {activeClassroom.role}
              </span>
            )}

            {/* Notifications toggle */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="การแจ้งเตือน"
              >
                <Bell className="h-5 w-5" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
                )}
              </button>

              {/* Notification dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-slate-900">การแจ้งเตือน</h4>
                    <span className="text-xs text-slate-500">
                      {unreadNotificationCount} ยังไม่ได้อ่าน
                    </span>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">ไม่มีการแจ้งเตือนใหม่</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className={`px-4 py-3 text-xs hover:bg-slate-50 cursor-pointer transition-colors ${
                            !n.read_at ? 'bg-brand-50/50 font-medium' : 'text-slate-600'
                          }`}
                        >
                          <p className="text-slate-900 font-semibold mb-0.5">
                            {n.payload.assignment_name || 'PairEval Alert'}
                          </p>
                          <p className="text-slate-600">{n.payload.message || 'มีการอัปเดตใหม่'}</p>
                          <p className="text-slate-400 text-[10px] mt-1">{formatDate(n.sent_at)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User profile and logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <span className="text-sm font-medium text-slate-700 hidden sm:inline">
                {user?.display_name || user?.email_raw}
              </span>
              <button
                onClick={() => setIsLogoutConfirmOpen(true)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="ออกจากระบบ"
                data-testid="logout-btn"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        title="ยืนยันการออกจากระบบ"
      >
        <div className="space-y-4 text-sm">
          <p className="text-slate-600">
            คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ? ข้อมูลการประเมินที่บันทึกแล้วจะยังคงอยู่ แต่ข้อที่ยังไม่ได้ตอบหรือกำลังส่งอาจไม่สมบูรณ์
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setIsLogoutConfirmOpen(false)}
              data-testid="cancel-logout-btn"
            >
              ยกเลิก
            </Button>
            <Button
              variant="danger"
              data-testid="confirm-logout-btn"
              onClick={() => {
                setIsLogoutConfirmOpen(false);
                logout();
              }}
            >
              ออกจากระบบ
            </Button>
          </div>
        </div>
      </Modal>
    </header>
  );
};
