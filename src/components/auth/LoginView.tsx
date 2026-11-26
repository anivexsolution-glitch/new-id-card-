import React, { useState } from 'react';
import { SchoolSettings } from '../../types';
import { Lock, User, ShieldCheck, KeyRound, AlertCircle, ArrowRight, School } from 'lucide-react';

interface LoginViewProps {
  schoolSettings: SchoolSettings;
  onLoginSuccess: (rememberMe: boolean) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  schoolSettings,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const expectedUsername = (schoolSettings.adminUsername || 'admin').trim();
  const expectedPassword = (schoolSettings.adminPassword || 'admin123').trim();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      if (
        username.trim().toLowerCase() === expectedUsername.toLowerCase() &&
        password.trim() === expectedPassword
      ) {
        onLoginSuccess(rememberMe);
      } else {
        setIsLoading(false);
        setErrorMsg('Invalid administrative credentials. Please verify username and password.');
      }
    }, 400);
  };

  const fillQuickCredentials = () => {
    setUsername(expectedUsername);
    setPassword(expectedPassword);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Background Decorative Academic Patterns */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="school-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#school-grid)" />
        </svg>
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* School Logo & Title Badge */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-xl border-2 border-amber-400/40 p-2 mb-3">
            {schoolSettings.logoUrl ? (
              <img
                src={schoolSettings.logoUrl}
                alt="School Emblem"
                className="w-full h-full object-contain"
              />
            ) : (
              <School className="w-8 h-8 text-blue-900" />
            )}
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {schoolSettings.schoolName || 'ScholarCard Pro'}
          </h1>
          <p className="text-xs text-blue-200/80 mt-1">
            Student Identity Card Management System · Session {schoolSettings.academicSession || '2025-26'}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
          <div className="px-7 pt-7 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Administrative Authentication
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Enter your authorized school credentials to access the card generation studio.
            </p>
          </div>

          <form onSubmit={handleLogin} className="px-7 pb-7 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Admin Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium text-slate-900"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Password
                </label>
                <span className="text-[11px] text-slate-400">Case-sensitive</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Remember this session</span>
              </label>

              <button
                type="button"
                onClick={fillQuickCredentials}
                className="text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                title="Fill default credentials for rapid login"
              >
                <KeyRound className="w-3 h-3" />
                <span>Fill Demo Login</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Institutional Security Footer */}
          <div className="bg-slate-50 px-7 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Default: <strong className="font-mono text-slate-700">admin</strong> / <strong className="font-mono text-slate-700">admin123</strong></span>
            <span className="text-[10px] bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded font-mono">
              v2.4 Secured
            </span>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-5">
          Authorized School Administrative Staff Only · Roster Data Encrypted
        </p>
      </div>
    </div>
  );
};
