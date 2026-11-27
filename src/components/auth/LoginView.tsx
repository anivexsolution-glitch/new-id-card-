import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';
import { AuthenticatedUser, SchoolSettings } from '../../types';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Cloud,
  CreditCard,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';

interface LoginViewProps {
  schoolSettings: SchoolSettings;
  pendingVerificationUser?: AuthenticatedUser | null;
  onCheckVerification?: () => Promise<boolean>;
}

type AuthMode = 'signin' | 'signup';

function mapFirebaseAuthError(err: any): string {
  const code = err?.code || '';
  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Sign-in window was closed before completing authentication.';
    case 'auth/popup-blocked':
      return 'Browser blocked the sign-in popup. Please allow popups for this site and try again.';
    case 'auth/cancelled-popup-request':
      return '';
    case 'auth/unauthorized-domain':
      return 'This domain is not yet authorized in Firebase Authentication. Add this hostname under Authentication > Settings > Authorized domains in Firebase Console.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled in Firebase Console yet. Enable it under Authentication > Sign-in method > Email/Password.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email address or password. Please check your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please switch to Sign In or continue with Google.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'Network connection error while contacting Firebase Authentication. Please check your internet connection.';
    default:
      return err?.message || 'Authentication failed. Please try again.';
  }
}

export const LoginView: React.FC<LoginViewProps> = ({
  schoolSettings,
  pendingVerificationUser,
  onCheckVerification,
}) => {
  const [authMode, setAuthMode] = useState<AuthMode>('signin');

  // Form inputs
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [isVerifyActionLoading, setIsVerifyActionLoading] = useState(false);

  const switchMode = (nextMode: AuthMode) => {
    setAuthMode(nextMode);
    setErrorMsg('');
    setInfoMsg('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setIsGoogleLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      const mapped = mapFirebaseAuthError(err);
      if (mapped) setErrorMsg(mapped);
      setIsGoogleLoading(false);
    }
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMsg('Please enter both email address and password.');
      return;
    }

    if (authMode === 'signup') {
      if (!fullName.trim()) {
        setErrorMsg('Please enter your name or school administrator name.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
    }

    setIsEmailLoading(true);
    try {
      if (authMode === 'signin') {
        const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        if (!cred.user.emailVerified) {
          setInfoMsg(
            `Please verify ${cred.user.email} before accessing your cloud workspace.`
          );
        }
      } else {
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        if (fullName.trim()) {
          await updateProfile(cred.user, { displayName: fullName.trim() });
        }
        await sendEmailVerification(cred.user);
        setInfoMsg(
          `Account created! A verification link has been sent to ${trimmedEmail}.`
        );
      }
    } catch (err: any) {
      const mapped = mapFirebaseAuthError(err);
      if (mapped) setErrorMsg(mapped);
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMsg('');
    setInfoMsg('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Enter your email address above first, then click Forgot password.');
      return;
    }

    setIsResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setInfoMsg(`Password reset email sent to ${trimmedEmail}. Please check your inbox.`);
    } catch (err: any) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setErrorMsg('');
    setInfoMsg('');
    if (!auth.currentUser) return;
    setIsVerifyActionLoading(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setInfoMsg(`Verification email re-sent to ${auth.currentUser.email}. Please check inbox or spam.`);
    } catch (err: any) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setIsVerifyActionLoading(false);
    }
  };

  const handleVerifyContinue = async () => {
    setErrorMsg('');
    setInfoMsg('');
    if (!onCheckVerification) return;
    setIsVerifyActionLoading(true);
    try {
      const verified = await onCheckVerification();
      if (!verified) {
        setErrorMsg('Your email is still not marked as verified. Click the link in your inbox first, then try again.');
      }
    } catch (err: any) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setIsVerifyActionLoading(false);
    }
  };

  const handleSignOutPending = async () => {
    setErrorMsg('');
    setInfoMsg('');
    await signOut(auth);
  };

  const anyBusy = isGoogleLoading || isEmailLoading || isResetLoading || isVerifyActionLoading;

  return (
    <div className="min-h-screen bg-[#F5F6F7] flex flex-col justify-center items-center px-4 py-10">
      <div className="w-full max-w-[440px]">
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
              School Identity Management &amp; ID Card Design Studio
            </p>
          </div>
        </div>

        {/* Pending Email Verification Gate */}
        {pendingVerificationUser ? (
          <div className="bg-white rounded-[12px] border border-[#E3E7EB] shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-[#E3E7EB]">
              <h2 className="text-base font-bold text-[#202B38]">
                Verify Your Email Address
              </h2>
              <p className="text-xs text-[#75808C] mt-1 leading-relaxed">
                To protect your private school workspace, confirm your email address before syncing data.
              </p>
            </div>

            <div className="p-6 space-y-4">
              {errorMsg && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-[#C44949]/8 border border-[#C44949]/30 flex items-start gap-2.5 text-xs text-[#C44949]"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {infoMsg && (
                <div className="p-3 rounded-lg bg-[#25845A]/10 border border-[#25845A]/30 flex items-start gap-2.5 text-xs text-[#25845A]">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{infoMsg}</span>
                </div>
              )}

              <div className="p-3.5 rounded-lg bg-[#F5F6F7] border border-[#E3E7EB] text-xs space-y-1">
                <p className="font-semibold text-[#202B38]">Verification link sent to:</p>
                <p className="font-mono text-[#24364B] break-all">
                  {pendingVerificationUser.email}
                </p>
              </div>

              <button
                type="button"
                onClick={handleVerifyContinue}
                disabled={isVerifyActionLoading}
                className="w-full h-10 bg-[#24364B] hover:bg-[#304A64] text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isVerifyActionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>I&apos;ve Verified My Email — Continue</span>
              </button>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isVerifyActionLoading}
                  className="text-xs font-semibold text-[#24364B] hover:underline disabled:opacity-60 cursor-pointer"
                >
                  Resend verification email
                </button>
                <button
                  type="button"
                  onClick={handleSignOutPending}
                  disabled={isVerifyActionLoading}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#C44949] hover:underline disabled:opacity-60 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Use another account</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Sign In / Sign Up Card */
          <div className="bg-white rounded-[12px] border border-[#E3E7EB] shadow-sm overflow-hidden">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 border-b border-[#E3E7EB] bg-[#F5F6F7]">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className={`py-3 text-xs font-bold transition-colors cursor-pointer ${
                  authMode === 'signin'
                    ? 'bg-white text-[#202B38] border-b-2 border-[#24364B]'
                    : 'text-[#75808C] hover:text-[#202B38]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`py-3 text-xs font-bold transition-colors cursor-pointer ${
                  authMode === 'signup'
                    ? 'bg-white text-[#202B38] border-b-2 border-[#24364B]'
                    : 'text-[#75808C] hover:text-[#202B38]'
                }`}
              >
                Create Account
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-[#202B38]">
                  {authMode === 'signin'
                    ? 'Sign in to your workspace'
                    : 'Create your school workspace'}
                </h2>
                <p className="text-xs text-[#75808C] mt-1">
                  {authMode === 'signin'
                    ? 'Sync your student roster, templates, and print batches securely across devices.'
                    : 'Register with email or continue with Google for an isolated cloud workspace.'}
                </p>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-[#C44949]/8 border border-[#C44949]/30 flex items-start gap-2.5 text-xs text-[#C44949]"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {infoMsg && (
                <div className="p-3 rounded-lg bg-[#25845A]/10 border border-[#25845A]/30 flex items-start gap-2.5 text-xs text-[#25845A]">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{infoMsg}</span>
                </div>
              )}

              {/* Email & Password Form */}
              <form onSubmit={handleEmailAuthSubmit} className="space-y-3.5">
                {authMode === 'signup' && (
                  <div>
                    <label
                      htmlFor="auth-fullname"
                      className="block text-xs font-semibold text-[#202B38] mb-1.5"
                    >
                      Full Name / Administrator
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-[#75808C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="auth-fullname"
                        type="text"
                        required
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g., Rajesh Sharma"
                        className="w-full h-10 text-sm pl-9 pr-3 rounded-lg border border-[#E3E7EB] bg-white text-[#202B38] placeholder:text-[#75808C] focus:outline-none focus:border-[#24364B]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-semibold text-[#202B38] mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#75808C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="auth-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@school.edu"
                      className="w-full h-10 text-sm pl-9 pr-3 rounded-lg border border-[#E3E7EB] bg-white text-[#202B38] placeholder:text-[#75808C] focus:outline-none focus:border-[#24364B]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="auth-password"
                      className="text-xs font-semibold text-[#202B38]"
                    >
                      Password
                    </label>
                    {authMode === 'signin' ? (
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={anyBusy}
                        className="text-[11px] font-semibold text-[#24364B] hover:underline disabled:opacity-60 cursor-pointer"
                      >
                        {isResetLoading ? 'Sending reset...' : 'Forgot password?'}
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#75808C]">Min. 6 characters</span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#75808C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        authMode === 'signin' ? 'Enter your password' : 'Create a strong password'
                      }
                      className="w-full h-10 text-sm pl-9 pr-10 rounded-lg border border-[#E3E7EB] bg-white text-[#202B38] placeholder:text-[#75808C] focus:outline-none focus:border-[#24364B]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-[#75808C] hover:text-[#202B38] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {authMode === 'signup' && (
                  <div>
                    <label
                      htmlFor="auth-confirm-password"
                      className="block text-xs font-semibold text-[#202B38] mb-1.5"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#75808C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="auth-confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full h-10 text-sm pl-9 pr-3 rounded-lg border border-[#E3E7EB] bg-white text-[#202B38] placeholder:text-[#75808C] focus:outline-none focus:border-[#24364B]"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={anyBusy}
                  className="w-full h-10 bg-[#24364B] hover:bg-[#304A64] text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isEmailLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {authMode === 'signin' ? 'Signing in...' : 'Creating account...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>{authMode === 'signin' ? 'Sign In with Email' : 'Create Account'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-[#E3E7EB]" />
                <span className="shrink-0 mx-3 text-[11px] font-medium text-[#75808C] uppercase tracking-wider">
                  Or continue with
                </span>
                <div className="flex-grow border-t border-[#E3E7EB]" />
              </div>

              {/* Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={anyBusy}
                className="w-full h-10 bg-white hover:bg-[#F5F6F7] text-[#202B38] border border-[#E3E7EB] text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#24364B]" />
                    <span>Connecting with Google...</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                      />
                    </svg>
                    <span>Google</span>
                  </>
                )}
              </button>

              <div className="pt-2 border-t border-[#E3E7EB] space-y-2 text-[11px] text-[#536477]">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#25845A] shrink-0 mt-0.5" />
                  <span>
                    Each verified account has a strictly isolated workspace—no other user can view or sync your school data.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Cloud className="w-3.5 h-3.5 text-[#24364B] shrink-0 mt-0.5" />
                  <span>
                    Sign in with the same account on any device to keep records synchronized automatically.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Developer / Company Details */}
        <div className="mt-4 bg-white rounded-[10px] border border-[#E3E7EB] px-4 py-3 text-[11px] text-[#536477]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-semibold text-[#202B38]">
              <Building2 className="w-3.5 h-3.5 text-[#A77C50] shrink-0" />
              <span>Developed by Anivex Solution</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 w-[161.156px]">
              <a
                href="https://anivexsolution.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#24364B] hover:underline font-medium"
              >
                <Globe className="w-3 h-3 text-[#75808C]" />
                <span>anivexsolution.in</span>
              </a>
              <a
                href="mailto:info@anivexsolution.in"
                className="inline-flex items-center gap-1 text-[#24364B] hover:underline font-medium"
              >
                <Mail className="w-3 h-3 text-[#75808C]" />
                <span>info@anivexsolution.in</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
