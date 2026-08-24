import React, { useState } from 'react';
import { useAuth } from '../../app/AuthContext';
import { Button } from '../../components/Button';
import { Layers, ShieldCheck, UserCheck, GraduationCap } from 'lucide-react';
import { Alert } from '../../components/Alert';

export const LoginView: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [customEmail, setCustomEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (email: string, name?: string) => {
    setError(null);
    try {
      await login(email, name);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-brand-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 bg-brand-500/20 text-brand-400 rounded-2xl ring-1 ring-brand-500/30 mb-4">
          <Layers className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">PairEval</h1>
        <p className="mt-2 text-sm text-slate-300">
          ระบบประเมินผลงานกลุ่มและรายบุคคลแบบ Pairwise Comparison
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/10 backdrop-blur-md py-8 px-4 shadow-2xl ring-1 ring-white/15 sm:rounded-3xl sm:px-10">
          {error && (
            <Alert type="error" className="mb-6">
              {error}
            </Alert>
          )}

          {/* Quick presets */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              เข้าสู่ระบบผ่าน Google University Account
            </h2>

            <button
              onClick={() => handleLogin('prof.somchai@uni.ac.th', 'อ.สมชาย (Owner)')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-purple-500/20 text-purple-300">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-sm text-white group-hover:text-brand-300">
                    อาจารย์ผู้สอน (Instructor / Owner)
                  </p>
                  <p className="text-xs text-slate-400">prof.somchai@uni.ac.th</p>
                </div>
              </div>
              <span className="text-xs text-slate-400 font-mono">Login &rarr;</span>
            </button>

            <button
              onClick={() => handleLogin('ta.preeya@uni.ac.th', 'TA ปรียา')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-amber-500/20 text-amber-300">
                  <UserCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-sm text-white group-hover:text-brand-300">
                    ผู้ช่วยสอน (Teaching Assistant)
                  </p>
                  <p className="text-xs text-slate-400">ta.preeya@uni.ac.th</p>
                </div>
              </div>
              <span className="text-xs text-slate-400 font-mono">Login &rarr;</span>
            </button>

            <button
              onClick={() => handleLogin('nok@uni.ac.th', 'น้องนก (Student)')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-sm text-white group-hover:text-brand-300">
                    นักศึกษา (Student — นก กลุ่ม Aurora)
                  </p>
                  <p className="text-xs text-slate-400">nok@uni.ac.th</p>
                </div>
              </div>
              <span className="text-xs text-slate-400 font-mono">Login &rarr;</span>
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900/60 px-2 text-slate-400">หรือระบุอีเมลอื่น</span>
            </div>
          </div>

          {/* Custom email form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customEmail) handleLogin(customEmail, displayName || undefined);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-slate-300">University Email</label>
              <input
                type="email"
                required
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="student@uni.ac.th"
                className="mt-1 block w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">Display Name (ทางเลือก)</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="ชื่อ-นามสกุล"
                className="mt-1 block w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full bg-brand-500 hover:bg-brand-600 font-semibold"
            >
              เข้าสู่ระบบด้วย Google OIDC
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
