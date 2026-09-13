import React, { useState } from 'react';
import { useAuth } from '../../app/AuthContext';
import { Layers, ShieldCheck, Lock, Sparkles } from 'lucide-react';
import { Alert } from '../../components/Alert';
import { GoogleOAuthModal } from './GoogleOAuthModal';

export const LoginView: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectGoogleAccount = async (email: string, name?: string) => {
    setError(null);
    try {
      await login(email, name);
      setIsGoogleModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-brand-500 selection:text-white relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-10 max-w-6xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-500/20 text-brand-400 rounded-2xl ring-1 ring-brand-500/30 flex items-center justify-center">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-white">PairEval</span>
            <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Campus Edition
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Google Workspace SSO Protected</span>
        </div>
      </header>

      {/* Main Hero & Auth Section - Centered */}
      <main className="relative z-10 max-w-md mx-auto w-full px-6 py-8 my-auto flex flex-col items-center justify-center text-center">
        <div className="w-full text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-200 text-xs font-medium mb-4 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Evidence-based Pairwise Peer Evaluation</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl text-center">
            ยินดีต้อนรับสู่ <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-400 font-black drop-shadow-[0_2px_12px_rgba(56,189,248,0.45)]">PairEval</span>
          </h1>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed text-center max-w-sm mx-auto">
            ระบบประเมินผลงานกลุ่มและเพื่อนร่วมทีมแบบจับคู่เปรียบเทียบ ยุติธรรม โปร่งใส ปราศจากความลำเอียง
          </p>
        </div>

        {/* Auth Card */}
        <div className="w-full bg-slate-900/80 backdrop-blur-xl py-8 px-6 sm:px-8 rounded-3xl shadow-2xl ring-1 ring-white/10">
          {error && (
            <Alert type="error" className="mb-6">
              {error}
            </Alert>
          )}

          <div className="space-y-4">
            {/* Official Google Sign In Button */}
            <button
              onClick={() => setIsGoogleModalOpen(true)}
              className="w-full flex items-center justify-center gap-3.5 py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg hover:ring-2 hover:ring-brand-400/50 cursor-pointer active:scale-[0.99]"
            >
              {/* Official Google 'G' Icon */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>ลงชื่อเข้าใช้ด้วย Google (Sign in with Google)</span>
            </button>

            <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>รองรับบัญชี Google Workspace ของมหาวิทยาลัย</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl mx-auto w-full px-6 py-6 text-center text-xs text-slate-500 border-t border-slate-900">
        &copy; {new Date().getFullYear()} PairEval System. All rights reserved.
      </footer>

      {/* Realistic Google OAuth Simulation Modal */}
      <GoogleOAuthModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onSelectAccount={handleSelectGoogleAccount}
        isLoading={isLoading}
      />
    </div>
  );
};
