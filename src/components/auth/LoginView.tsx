import React, { useState } from 'react';
import { SchoolSettings } from '../../types';
import { Lock, User, Eye, EyeOff, KeyRound, AlertCircle, ArrowRight, CreditCard, Info } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);
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
        setErrorMsg('Invalid credentials. Please verify your username and password.');
      }
    }, 300);
  };

  const fillQuickCredentials = () => {
    setUsername(expectedUsername);
    setPassword(expectedPassword);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-[#F5F6F7] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-[10px] bg-[#24364B] border border-[#E3E7EB] flex items-center justify-center shrink-0 overflow-hidden">
            {schoolSettings.logoUrl ? (
              <img
                src={schoolSettings.logoUrl}
                alt={schoolSettings.schoolName}
                className="w-full h-full object-contain bg-white p-1"
                referrerPolicy="no-referrer"
              />
            ) : (
              <CreditCard className="w-5 h-5 text-[#A77C50]" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold tracking-tight text-[#202B38]">
              THE ID MAKER
            </h1>
            <p className="text-xs text-[#75808C] truncate">
              {schoolSettings.schoolName || 'School Identity Management'} · Session {schoolSettings.academicSession || '2025-26'}
            </p>
          </div>
        </div>

        {/* Clean Flat Login Surface */}
        <div className="bg-white rounded-[12px] border border-[#E3E7EB] shadow-sm overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-[#E3E7EB]">
            <h2 className="text-base font-bold text-[#202B38]">
              Administrator Sign In
            </h2>
            <p className="text-xs text-[#75808C] mt-1">
              Sign in to manage student records, design templates, and print CR80 ID cards.
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4">
            {errorMsg && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-[#C44949]/8 border border-[#C44949]/30 flex items-start gap-2.5 text-xs text-[#C44949]"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-semibold text-[#202B38] mb-1.5"
              >
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#75808C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-username"
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username (default: admin)"
                  className="w-full h-10 text-sm pl-9 pr-3 rounded-lg border border-[#E3E7EB] bg-white text-[#202B38] placeholder:text-[#75808C] focus:outline-none focus:border-[#24364B] transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="text-xs font-semibold text-[#202B38]"
                >
                  Password
                </label>
                <span className="text-[11px] text-[#75808C]">Case-sensitive</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#75808C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full h-10 text-sm pl-9 pr-10 rounded-lg border border-[#E3E7EB] bg-white text-[#202B38] placeholder:text-[#75808C] focus:outline-none focus:border-[#24364B] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-[#75808C] hover:text-[#202B38]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 text-[#536477] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#E3E7EB] text-[#24364B] focus:ring-[#24364B] cursor-pointer"
                />
                <span>Keep me signed in</span>
              </label>

              <button
                type="button"
                onClick={fillQuickCredentials}
                className="text-xs font-semibold text-[#24364B] hover:text-[#304A64] hover:underline flex items-center gap-1"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#A77C50]" />
                <span>Fill Demo Credentials</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-[#24364B] hover:bg-[#304A64] text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="bg-[#F5F6F7] px-6 py-3 border-t border-[#E3E7EB] flex items-center justify-between text-xs text-[#75808C]">
            <span>
              Default: <strong className="font-mono text-[#202B38]">admin</strong> / <strong className="font-mono text-[#202B38]">admin123</strong>
            </span>
            <span className="text-[11px]">Single-station mode</span>
          </div>
        </div>

        {/* Honest Security Architecture Disclosure */}
        <div className="mt-4 p-3 rounded-[10px] bg-white border border-[#E3E7EB] flex items-start gap-2.5 text-[11px] text-[#75808C]">
          <Info className="w-3.5 h-3.5 text-[#A77C50] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Local browser session authentication is active for offline workstation use. Implement backend authentication and server-side authorization before multi-user network deployment.
          </p>
        </div>
      </div>
    </div>
  );
};
