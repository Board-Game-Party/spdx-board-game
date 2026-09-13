import React, { useState } from 'react';
import { User, Eye, EyeOff, X, Loader2, Info, ChevronDown, ChevronUp, Users, Shield, GraduationCap } from 'lucide-react';

interface GoogleOAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (email: string, name?: string) => Promise<void>;
  isLoading: boolean;
}

export interface DemoUser {
  category: 'Staff' | 'Group Alpha' | 'Group Beta' | 'Group Gamma' | 'Group Delta';
  role: string;
  email: string;
  name: string;
  studentId?: string;
  badgeColor: string;
}

export const SAMPLE_USERS: DemoUser[] = [
  // Staff
  {
    category: 'Staff',
    role: 'Instructor (Owner)',
    email: 'prof.somchai@uni.ac.th',
    name: 'อ.สมชาย ใจดี (Owner)',
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  {
    category: 'Staff',
    role: 'Teaching Assistant (TA)',
    email: 'ta.preeya@uni.ac.th',
    name: 'ปรียา สุขสันต์ (TA)',
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  // Group Alpha (Aurora)
  {
    category: 'Group Alpha',
    role: 'Student',
    email: 'nok@uni.ac.th',
    name: 'น้องนก สดใส',
    studentId: '65010001',
    badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  {
    category: 'Group Alpha',
    role: 'Student',
    email: 'sompong@uni.ac.th',
    name: 'สมพงษ์ มุ่งมั่น',
    studentId: '65010002',
    badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  // Group Beta (Blaze)
  {
    category: 'Group Beta',
    role: 'Student',
    email: 'wichai@uni.ac.th',
    name: 'วิชัย การันตี',
    studentId: '65010003',
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  {
    category: 'Group Beta',
    role: 'Student',
    email: 'anan@uni.ac.th',
    name: 'อนันต์ เจริญผล',
    studentId: '65010004',
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  // Group Gamma (Cosmos)
  {
    category: 'Group Gamma',
    role: 'Student',
    email: 'manee@uni.ac.th',
    name: 'มานี มีสุข',
    studentId: '65010005',
    badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  {
    category: 'Group Gamma',
    role: 'Student',
    email: 'chujai@uni.ac.th',
    name: 'ชูใจ ใจกล้า',
    studentId: '65010006',
    badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  // Group Delta (Dynamo)
  {
    category: 'Group Delta',
    role: 'Student',
    email: 'piti@uni.ac.th',
    name: 'ปิติ รักเรียน',
    studentId: '65010007',
    badgeColor: 'bg-teal-100 text-teal-700 border-teal-200',
  },
  {
    category: 'Group Delta',
    role: 'Student',
    email: 'veera@uni.ac.th',
    name: 'วีระ แข็งขัน',
    studentId: '65010008',
    badgeColor: 'bg-teal-100 text-teal-700 border-teal-200',
  },
];

export const GoogleOAuthModal: React.FC<GoogleOAuthModalProps> = ({
  isOpen,
  onClose,
  onSelectAccount,
  isLoading,
}) => {
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showHelper, setShowHelper] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmailNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('กรุณากรอกอีเมลมหาวิทยาลัย');
      return;
    }
    setErrorMsg(null);
    // Auto-match display name if in list
    const matched = SAMPLE_USERS.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (matched && !displayName) {
      setDisplayName(matched.name);
    }
    setStep('password');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await onSelectAccount(email.trim(), displayName.trim() || undefined);
    } catch (err: any) {
      setErrorMsg(err.message || 'การเข้าสู่ระบบล้มเหลว');
    }
  };

  const handleQuickFill = (targetEmail: string, targetName: string) => {
    setEmail(targetEmail);
    setDisplayName(targetName);
    setPassword('Demo123456');
    setErrorMsg(null);
  };

  const resetModal = () => {
    setStep('email');
    setEmail('');
    setPassword('');
    setDisplayName('');
    setErrorMsg(null);
    setShowHelper(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-[460px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 text-slate-800 transition-all max-h-[90vh] flex flex-col">
        
        {/* Top Header */}
        <div className="px-8 pt-7 pb-3 relative shrink-0">
          <button
            onClick={resetModal}
            className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Google Logo SVG */}
          <div className="flex justify-start mb-3">
            <svg className="h-6 w-auto" viewBox="0 0 272 92" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M115.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18C71.25 34.32 81.24 25 93.5 25s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44S80.99 39.2 80.99 47.18c0 7.9 5.79 13.44 12.51 13.44s12.51-5.55 12.51-13.44z" fill="#EA4335"/>
              <path d="M163.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18c0-12.85 9.99-22.18 22.25-22.18s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44s-12.51 5.46-12.51 13.44c0 7.9 5.79 13.44 12.51 13.44s12.51-5.55 12.51-13.44z" fill="#FBBC05"/>
              <path d="M209.75 26.34v39.82c0 16.38-9.66 23.07-21.08 23.07-10.75 0-17.22-7.19-19.66-13.07l8.48-3.53c1.51 3.61 5.21 7.87 11.17 7.87 7.31 0 11.84-4.51 11.84-12.98v-3.19h-.34c-2.18 2.69-6.38 5.04-11.68 5.04-11.09 0-21.25-9.66-21.25-22.09 0-12.52 10.16-22.18 21.25-22.18 5.29 0 9.49 2.35 11.68 4.96h.34v-3.72h9.25zm-8.65 21.01c0-7.81-5.21-13.44-11.84-13.44-6.72 0-12.26 5.63-12.26 13.44 0 7.73 5.54 13.44 12.26 13.44 6.63 0 11.84-5.71 11.84-13.44z" fill="#4285F4"/>
              <path d="M225 3v65h-9.5V3h9.5z" fill="#34A853"/>
              <path d="M262.02 54.48l7.56 5.04c-2.44 3.61-8.32 9.83-18.48 9.83-12.6 0-22.01-9.74-22.01-22.18 0-13.19 9.49-22.18 20.92-22.18 11.51 0 17.22 9.16 19.07 14.11l1.01 2.52-29.23 12.1c2.27 4.45 5.79 6.72 10.75 6.72 4.96 0 8.32-2.44 10.42-6.04zm-19.82-8.06l19.57-8.15c-1.09-2.77-4.37-4.7-8.32-4.7-4.95 0-11.76 4.37-11.25 12.85z" fill="#EA4335"/>
              <path d="M35.25 41.5v9.3h22.6c-.66 5.37-2.49 9.3-5.27 12.08-3.36 3.36-8.57 7.02-17.33 7.02-13.79 0-24.53-11.17-24.53-24.9s10.74-24.9 24.53-24.9c7.48 0 12.94 2.94 16.97 6.77l6.57-6.57C53.22 14.75 45.41 10 35.25 10 16.1 10 0 25.68 0 45s16.1 35 35.25 35c10.33 0 18.15-3.39 24.28-9.74 6.27-6.27 8.24-15.11 8.24-22.25 0-2.18-.17-4.2-.5-6.01H35.25z" fill="#4285F4"/>
            </svg>
          </div>

          <h2 className="text-2xl font-normal text-slate-900">
            {step === 'email' ? 'ลงชื่อเข้าใช้' : 'ยินดีต้อนรับ'}
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            {step === 'email' ? (
              <>ใช้บัญชี Google ของคุณเพื่อไปยัง <span className="font-semibold text-brand-600">PairEval</span></>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
                <User className="w-3.5 h-3.5 text-slate-500" />
                {email}
              </span>
            )}
          </p>
        </div>

        {errorMsg && (
          <div className="mx-8 mb-2 p-2.5 text-xs bg-red-50 border border-red-200 text-red-700 rounded-xl shrink-0">
            {errorMsg}
          </div>
        )}

        {/* Content Body - Scrollable */}
        <div className="px-8 pb-7 overflow-y-auto flex-1">
          {step === 'email' ? (
            /* STEP 1: EMAIL INPUT */
            <form onSubmit={handleEmailNext} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  อีเมลหรือโทรศัพท์ (Email or phone)
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="เช่น prof.somchai@uni.ac.th หรือ nok@uni.ac.th"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ชื่อที่แสดง (ทางเลือก)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="ชื่อ-นามสกุล (ดึงอัตโนมัติหากอยู่ในรายชื่อ)"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Collapsible Helper with ALL SE101 Accounts */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowHelper(!showHelper)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100/70 border border-blue-200 text-xs text-blue-700 font-medium cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>รายชื่อบัญชีในวิชา SE101 สำหรับ Demo (10 บัญชี)</span>
                  </div>
                  {showHelper ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showHelper && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 max-h-52 overflow-y-auto space-y-3 text-xs">
                    {/* Staff Section */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-purple-600" />
                        <span>อาจารย์ & ผู้ช่วยสอน (Staff)</span>
                      </div>
                      <div className="space-y-1.5">
                        {SAMPLE_USERS.filter((u) => u.category === 'Staff').map((user) => (
                          <div
                            key={user.email}
                            onClick={() => handleQuickFill(user.email, user.name)}
                            className="p-2 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 cursor-pointer transition-all flex items-center justify-between group"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-semibold text-slate-800 group-hover:text-blue-700 truncate">{user.name}</div>
                              <div className="text-slate-500 font-mono text-[11px] truncate">{user.email}</div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold shrink-0 ${user.badgeColor}`}>
                              {user.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Students Section by Groups */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                        <span>นักศึกษาตามกลุ่ม (Students — 4 กลุ่ม)</span>
                      </div>
                      <div className="space-y-1.5">
                        {SAMPLE_USERS.filter((u) => u.category !== 'Staff').map((user) => (
                          <div
                            key={user.email}
                            onClick={() => handleQuickFill(user.email, user.name)}
                            className="p-2 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 cursor-pointer transition-all flex items-center justify-between group"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-semibold text-slate-800 group-hover:text-blue-700 truncate">
                                {user.name} {user.studentId && <span className="text-slate-400 font-normal">({user.studentId})</span>}
                              </div>
                              <div className="text-slate-500 font-mono text-[11px] truncate">{user.email}</div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold shrink-0 ${user.badgeColor}`}>
                              {user.category}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end pt-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-full shadow-xs transition-all cursor-pointer"
                >
                  ถัดไป (Next)
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2: PASSWORD INPUT */
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ป้อนรหัสผ่านของคุณ (Enter your password)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="รหัสผ่าน"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showPass"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="showPass" className="text-xs text-slate-600 cursor-pointer">
                  แสดงรหัสผ่าน
                </label>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  &larr; เปลี่ยนบัญชี
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-full shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังตรวจสอบ...
                    </>
                  ) : (
                    'ถัดไป (Next)'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Privacy & Terms footer */}
          <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>ภาษาไทย (ไทย)</span>
            <div className="flex gap-3">
              <span className="hover:underline cursor-pointer">ความช่วยเหลือ</span>
              <span className="hover:underline cursor-pointer">ความเป็นส่วนตัว</span>
              <span className="hover:underline cursor-pointer">ข้อกำหนด</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
