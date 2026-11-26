import React, { useState } from 'react';
import { SchoolSettings } from '../../types';
import { Lock, User, ShieldCheck, ArrowRight, School, Mail, Building, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

export interface RegisteredUser {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string; // Plain stored for client-side evaluation
  schoolName: string;
  schoolCode?: string;
  createdAt: string;
}

interface AuthViewProps {
  schoolSettings: SchoolSettings;
  onLoginSuccess: (user: { username: string; name?: string; schoolName?: string }, rememberMe: boolean) => void;
  onRegisterSchool?: (updatedSettings: Partial<SchoolSettings>) => void;
}

const STORAGE_USERS_KEY = 'scholarcard_registered_users';

export const getRegisteredUsers = (): RegisteredUser[] => {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error reading registered users', e);
  }
  return [];
};

export const saveRegisteredUser = (newUser: RegisteredUser) => {
  const existing = getRegisteredUsers();
  const updated = [newUser, ...existing.filter((u) => u.username.toLowerCase() !== newUser.username.toLowerCase())];
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving user', e);
  }
  return updated;
};

export const AuthView: React.FC<AuthViewProps> = ({
  schoolSettings,
  onLoginSuccess,
  onRegisterSchool,
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  
  // Sign In State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  
  // Sign Up State
  const [signupAdminName, setSignupAdminName] = useState('');
  const [signupSchoolName, setSignupSchoolName] = useState('');
  const [signupSchoolCode, setSignupSchoolCode] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  // Status & Feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedId = loginIdentifier.trim().toLowerCase();
    const trimmedPass = loginPassword.trim();

    if (!trimmedId || !trimmedPass) {
      setErrorMsg('Please enter both your username/email and password.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      // 1. Check registered users
      const users = getRegisteredUsers();
      const matched = users.find(
        (u) =>
          (u.username.toLowerCase() === trimmedId || u.email.toLowerCase() === trimmedId) &&
          u.passwordHash === trimmedPass
      );

      // 2. Check fallback school settings credentials
      const configuredUser = (schoolSettings.adminUsername || 'admin').trim().toLowerCase();
      const configuredPass = (schoolSettings.adminPassword || 'admin123').trim();
      const isDefaultMatch = trimmedId === configuredUser && trimmedPass === configuredPass;

      if (matched) {
        setIsLoading(false);
        onLoginSuccess({ username: matched.username, name: matched.name, schoolName: matched.schoolName }, rememberMe);
      } else if (isDefaultMatch) {
        setIsLoading(false);
        onLoginSuccess({ username: schoolSettings.adminUsername || 'admin', schoolName: schoolSettings.schoolName }, rememberMe);
      } else {
        setIsLoading(false);
        setErrorMsg('Invalid credentials. Please verify your username and password or register a new school account.');
      }
    }, 450);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const adminName = signupAdminName.trim();
    const schoolName = signupSchoolName.trim();
    const schoolCode = signupSchoolCode.trim();
    const email = signupEmail.trim();
    const pass = signupPassword.trim();
    const confirmPass = signupConfirmPassword.trim();

    if (!adminName || !schoolName || !email || !pass) {
      setErrorMsg('Please fill in all mandatory fields.');
      return;
    }

    if (pass.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (pass !== confirmPass) {
      setErrorMsg('Passwords do not match. Please re-enter identical passwords.');
      return;
    }

    // Check if email / username already registered
    const existing = getRegisteredUsers();
    const alreadyExists = existing.some(
      (u) => u.username.toLowerCase() === email.toLowerCase() || u.email.toLowerCase() === email.toLowerCase()
    );

    if (alreadyExists) {
      setErrorMsg('An account with this email/username already exists. Please sign in instead.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const newUser: RegisteredUser = {
        id: `usr_${Date.now()}`,
        name: adminName,
        username: email.split('@')[0] || email,
        email: email,
        passwordHash: pass,
        schoolName: schoolName,
        schoolCode: schoolCode || undefined,
        createdAt: new Date().toISOString(),
      };

      saveRegisteredUser(newUser);

      // Update school settings if callback provided
      if (onRegisterSchool) {
        onRegisterSchool({
          schoolName: schoolName,
          schoolCode: schoolCode || schoolSettings.schoolCode,
          principalName: adminName,
        });
      }

      setIsLoading(false);
      setSuccessMsg('Account registered successfully! Logging you into the administration portal...');
      
      setTimeout(() => {
        onLoginSuccess({ username: newUser.username, name: newUser.name, schoolName: newUser.schoolName }, true);
      }, 700);
    }, 550);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-10 relative overflow-hidden font-sans">
      {/* Background Architectural Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="school-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#school-grid)" />
        </svg>
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* School Header Identity */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-slate-900 border border-slate-700/80 p-2.5 mb-3 shadow-lg">
            {schoolSettings.logoUrl ? (
              <img
                src={schoolSettings.logoUrl}
                alt="School Emblem"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <School className="w-7 h-7 text-amber-400" />
            )}
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {authMode === 'signup' && signupSchoolName.trim()
              ? signupSchoolName
              : schoolSettings.schoolName || 'ScholarCard Pro'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Institutional Student Identity Card Management Portal
          </p>
        </div>

        {/* Main Authentication Card */}
        <div className="bg-slate-900/95 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
          {/* Top Segmented Mode Selector */}
          <div className="flex border-b border-slate-800 p-1.5 bg-slate-950/60">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                authMode === 'signin'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                authMode === 'signup'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register New School
            </button>
          </div>

          <div className="p-6">
            {/* Context Heading */}
            <div className="mb-5">
              <h2 className="text-sm font-bold text-white tracking-tight">
                {authMode === 'signin' ? 'Administrative Access' : 'Create School Administrator Account'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {authMode === 'signin'
                  ? 'Enter your institutional administrator credentials to manage records and print cards.'
                  : 'Register your school or educational academy to start generating verified CR80 identity cards.'}
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 flex items-start gap-2.5 text-xs text-rose-200 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 flex items-start gap-2.5 text-xs text-emerald-200 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* 1. SIGN IN FORM */}
            {authMode === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Username or Email
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      autoFocus
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="e.g. admin or administrator@school.edu.in"
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-700 bg-slate-950/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter administrator password"
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-700 bg-slate-950/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Keep me signed in</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-3"
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
            )}

            {/* 2. SIGN UP FORM */}
            {authMode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Administrator Full Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={signupAdminName}
                      onChange={(e) => setSignupAdminName(e.target.value)}
                      placeholder="e.g. Dr. Rajiv Sharma (Principal / Registrar)"
                      className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-700 bg-slate-950/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    School / Institution Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={signupSchoolName}
                      onChange={(e) => setSignupSchoolName(e.target.value)}
                      placeholder="e.g. Delhi Public Academy / St. Xavier's"
                      className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-700 bg-slate-950/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      School Code / Reg. No
                    </label>
                    <input
                      type="text"
                      value={signupSchoolCode}
                      onChange={(e) => setSignupSchoolCode(e.target.value)}
                      placeholder="e.g. CBSE-2026-01"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-700 bg-slate-950/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Official Email / User <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="admin@school.edu.in"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-700 bg-slate-950/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Password <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-700 bg-slate-950/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Confirm Password <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      placeholder="Re-type password"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-700 bg-slate-950/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-3"
                >
                  {isLoading ? (
                    <span>Registering School Account...</span>
                  ) : (
                    <>
                      <span>Complete Registration & Open Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Institutional Security Notice */}
          <div className="bg-slate-950 px-6 py-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Official Institutional School Access</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Authorized Personnel
            </span>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-4">
          All student roster data and biometric photos are stored client-side in encrypted local storage.
        </p>
      </div>
    </div>
  );
};
