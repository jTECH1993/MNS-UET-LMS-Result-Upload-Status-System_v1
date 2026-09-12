import React, { useState, useEffect } from 'react';
import { MnsUetLogo } from './MnsUetLogo';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import { AuthService } from '../services/authService';
import { SecurityService } from '../services/securityService';
import { ActiveUserSession } from '../types';
import {
  Lock,
  User,
  Building,
  ShieldCheck,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  GraduationCap,
  BookOpen,
  Briefcase,
  Mail,
  ArrowLeft,
  Send,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';

interface Props {
  onAuthenticated: (session: ActiveUserSession) => void;
}

const STANDARD_DESIGNATION_OPTIONS = [
  'Lecturer',
  'Assistant Professor',
  'Associate Professor',
  'Professor',
  'Visiting Lecturer',
  'Program Coordinator',
  'Head of Department (HOD)',
] as const;

export const AuthScreen: React.FC<Props> = ({ onAuthenticated }) => {
  const [tab, setTab] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>('LOGIN');

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [lockoutRemainingSeconds, setLockoutRemainingSeconds] = useState<number>(0);

  // Register form state
  const [regRole, setRegRole] = useState<'COORDINATOR' | 'HOD' | 'LECTURER' | 'VISITING_LECTURER'>('COORDINATOR');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDepartment, setRegDepartment] = useState(UNIVERSITY_DEPARTMENTS[0].name);
  const [regProgram, setRegProgram] = useState<string>(() => {
    const dept0 = UNIVERSITY_DEPARTMENTS[0];
    return dept0.programs[0]?.name || 'BS Artificial Intelligence';
  });
  const [regDesignation, setRegDesignation] = useState('');
  const [isCustomDesignation, setIsCustomDesignation] = useState(false);
  const [customDesignation, setCustomDesignation] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [useEmailAsUsername, setUseEmailAsUsername] = useState(true);
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Forgot Password state
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1); // 1: Enter email/username, 2: Enter OTP, 3: Set new password
  const [activeResetToken, setActiveResetToken] = useState<string>('');
  const [targetEmail, setTargetEmail] = useState<string>('');
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [emailSentTimestamp, setEmailSentTimestamp] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Status feedback
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutRemainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setErrorMessage('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutRemainingSeconds]);

  const handleRoleSelection = (newRole: 'COORDINATOR' | 'HOD' | 'LECTURER' | 'VISITING_LECTURER') => {
    setRegRole(newRole);
    // Do not force "Program Coordinator" as default
  };

  const handleDepartmentSelection = (newDept: string) => {
    setRegDepartment(newDept);
    const deptObj = UNIVERSITY_DEPARTMENTS.find((d) => d.name === newDept);
    if (deptObj && deptObj.programs.length > 0) {
      setRegProgram(deptObj.programs[0].name);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (lockoutRemainingSeconds > 0) {
      setErrorMessage(`Account lockout active. Please wait ${lockoutRemainingSeconds} seconds.`);
      return;
    }

    setIsSubmitting(true);
    const result = AuthService.login(loginUsername, loginPassword);
    setIsSubmitting(false);

    if (result.success && result.session) {
      setSuccessMessage(result.message);
      setTimeout(() => {
        onAuthenticated(result.session!);
      }, 300);
    } else {
      if (result.isLocked && result.remainingSeconds) {
        setLockoutRemainingSeconds(result.remainingSeconds);
      }
      setErrorMessage(result.message);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    const finalUsername = useEmailAsUsername
      ? regEmail.trim()
      : (regUsername.trim() || regEmail.trim());

    if (!finalUsername) {
      setErrorMessage('Please provide your email address or a valid username.');
      return;
    }

    const finalDesignation = (isCustomDesignation ? customDesignation : regDesignation).trim();
    if (!finalDesignation) {
      setErrorMessage('Please select or specify your Designation Title (e.g. Lecturer, Assistant Professor, etc.).');
      return;
    }

    setIsSubmitting(true);
    const result = AuthService.registerAccount({
      name: regName,
      email: regEmail,
      department: regDepartment,
      designation: finalDesignation,
      username: finalUsername,
      password: regPassword,
      role: regRole,
      program: regRole !== 'HOD' ? regProgram : undefined,
    });
    setIsSubmitting(false);

    if (result.success && result.session) {
      setSuccessMessage(result.message);
      setTimeout(() => {
        onAuthenticated(result.session!);
      }, 400);
    } else {
      setErrorMessage(result.message);
    }
  };

  // Helper to trigger email dispatch notification
  const triggerDispatchEmail = (email: string, code: string) => {
    try {
      fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `MNS-UET LMS Password Reset OTP: ${code}`,
          recipient: email,
          security_code: code,
          portal: 'MNS-UET OBE & Monitoring Portal',
          notice: `Your one-time password reset code is ${code}. Please enter this 6-digit code on the portal to reset your password. Code expires in 15 minutes.`,
        }),
      }).catch(() => {});
    } catch {
      // Non-blocking fallback
    }
  };

  // Forgot Password: Step 1 - Send Code to Email (Compulsory Email Verification)
  const handleForgotStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = forgotIdentifier.trim();
    if (!cleanEmail) {
      setErrorMessage('Email address is compulsory. Please enter your registered university email.');
      return;
    }

    if (!cleanEmail.includes('@') || cleanEmail.indexOf('.') === -1) {
      setErrorMessage('Email address is compulsory for password recovery. Please enter a valid email address (e.g. your_email@mnsuet.edu.pk).');
      return;
    }

    setIsSubmitting(true);
    const res = AuthService.initiatePasswordReset(cleanEmail);
    setIsSubmitting(false);

    if (res.success && res.resetToken && res.otpCode && res.email) {
      setActiveResetToken(res.resetToken);
      setTargetEmail(res.email);
      setEmailSentTimestamp(new Date().toLocaleTimeString());
      setSuccessMessage(res.message);
      setForgotStep(2);
      triggerDispatchEmail(res.email, res.otpCode);
      setResendCooldown(30);
    } else {
      setErrorMessage(res.message);
    }
  };

  // Handle resend verification code
  const handleResendCode = () => {
    if (!forgotIdentifier || resendCooldown > 0) return;
    setIsSubmitting(true);
    const res = AuthService.initiatePasswordReset(forgotIdentifier);
    setIsSubmitting(false);

    if (res.success && res.resetToken && res.otpCode && res.email) {
      setActiveResetToken(res.resetToken);
      setTargetEmail(res.email);
      setEmailSentTimestamp(new Date().toLocaleTimeString());
      setSuccessMessage(`New security code generated and dispatched to ${res.email}`);
      triggerDispatchEmail(res.email, res.otpCode);
      setResendCooldown(30);
    } else {
      setErrorMessage(res.message);
    }
  };

  // Forgot Password: Step 2 - Verify Code
  const handleForgotStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    const res = AuthService.verifyPasswordResetCode(activeResetToken, enteredOtp);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage(res.message);
      setForgotStep(3);
    } else {
      setErrorMessage(res.message);
    }
  };

  // Forgot Password: Step 3 - Set New Password
  const handleForgotStep3Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('New passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);
    const res = AuthService.completePasswordReset(activeResetToken, newPassword);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage(res.message);
      setLoginUsername(forgotIdentifier);
      setLoginPassword(newPassword);
      setTimeout(() => {
        setTab('LOGIN');
        setForgotStep(1);
        setEmailSentTimestamp('');
        setEnteredOtp('');
        setNewPassword('');
        setConfirmNewPassword('');
      }, 1500);
    } else {
      setErrorMessage(res.message);
    }
  };

  const regPassStrength = SecurityService.validatePasswordStrength(regPassword);
  const newPassStrength = SecurityService.validatePasswordStrength(newPassword);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-800 font-sans relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-700/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-xl w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Institutional Crest & Brand Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white p-6 sm:p-7 relative">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white p-1.5 shadow-lg border-2 border-emerald-400 shrink-0 flex items-center justify-center">
              <MnsUetLogo className="w-full h-full" />
            </div>
            <div>
              <span className="inline-block bg-emerald-800/90 text-emerald-200 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-emerald-500/60 mb-1">
                Central Monitoring Portal
              </span>
              <h1 className="text-lg sm:text-xl font-black text-white leading-tight">
                Muhammad Nawaz Sharif UET Multan
              </h1>
              <p className="text-xs text-emerald-200 font-semibold mt-0.5">
                Institutional &amp; Academic Monitoring System
              </p>
              <div className="inline-flex items-center gap-1.5 mt-2 bg-emerald-950/90 text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-md border border-emerald-600/70 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active Task: LMS Result Upload Status</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        {tab !== 'FORGOT_PASSWORD' ? (
          <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setTab('LOGIN');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`py-3.5 px-4 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                tab === 'LOGIN'
                  ? 'border-emerald-600 bg-white text-emerald-900 shadow-2xs font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In (Authorized Users)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('REGISTER');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`py-3.5 px-4 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                tab === 'REGISTER'
                  ? 'border-emerald-600 bg-white text-emerald-900 shadow-2xs font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Create New Account (HOD / Coord)</span>
            </button>
          </div>
        ) : (
          <div className="border-b border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setTab('LOGIN');
                setErrorMessage('');
                setSuccessMessage('');
                setForgotStep(1);
                setEmailSentTimestamp('');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Sign In</span>
            </button>
            <span className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider">
              Account Security &bull; Password Recovery
            </span>
          </div>
        )}

        {/* Alerts */}
        {errorMessage && (
          <div className="m-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Security Alert</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {lockoutRemainingSeconds > 0 && (
          <div className="m-4 p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2 animate-in fade-in">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Anti-Brute-Force Lockout Engaged</p>
              <p>
                Too many incorrect login attempts. Cooling down for{' '}
                <strong className="font-mono text-amber-800">{lockoutRemainingSeconds}s</strong> before accepting further attempts.
              </p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="m-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Operation Verified</p>
              <p>{successMessage}</p>
            </div>
          </div>
        )}

        {/* TAB 1: SIGN IN */}
        {tab === 'LOGIN' && (
          <div className="p-6 sm:p-8 space-y-6">
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Username or Registered Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="e.g. admin, VC, or your email"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('FORGOT_PASSWORD');
                      setForgotIdentifier(loginUsername.includes('@') ? loginUsername : '');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your account password"
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || lockoutRemainingSeconds > 0}
                className={`w-full py-3 text-white font-bold rounded-lg text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                  lockoutRemainingSeconds > 0
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 cursor-pointer'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {lockoutRemainingSeconds > 0
                    ? `Locked (${lockoutRemainingSeconds}s)`
                    : isSubmitting
                    ? 'Authenticating...'
                    : 'Sign In to Monitoring Portal'}
                </span>
              </button>
            </form>

            {/* Anti-Hacking Security Badge */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-[11px] text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Anti-Brute Force &amp; Intrusion Defense Active
              </span>
              <span className="font-bold text-slate-500">MNS-UET IT Directorate</span>
            </div>
          </div>
        )}

        {/* TAB 2: CREATE NEW ACCOUNT (SIGN UP) */}
        {tab === 'REGISTER' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">Department Isolation Security</strong>
                <span>
                  When you select your Department, your account is strictly isolated. You will
                  only have access to manage and view result status for your registered department.
                </span>
              </div>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* Institutional Role Selector: 4 Categories */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Institutional Academic Category <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRoleSelection('COORDINATOR')}
                    className={`py-2 px-3 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      regRole === 'COORDINATOR'
                        ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/30 text-teal-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-1.5 rounded-md shrink-0 ${regRole === 'COORDINATOR' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs block">Program Coordinator</span>
                      <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                        Incharge of specific degree program (e.g. BS AI)
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleSelection('HOD')}
                    className={`py-2 px-3 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      regRole === 'HOD'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-1.5 rounded-md shrink-0 ${regRole === 'HOD' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs block">Head of Department (HOD)</span>
                      <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                        Departmental executive oversight
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleSelection('LECTURER')}
                    className={`py-2 px-3 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      regRole === 'LECTURER'
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/30 text-blue-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-1.5 rounded-md shrink-0 ${regRole === 'LECTURER' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs block">Regular Lecturer</span>
                      <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                        Faculty course instructor
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleSelection('VISITING_LECTURER')}
                    className={`py-2 px-3 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      regRole === 'VISITING_LECTURER'
                        ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/30 text-amber-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-1.5 rounded-md shrink-0 ${regRole === 'VISITING_LECTURER' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs block">Visiting Lecturer</span>
                      <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                        Adjunct / Visiting faculty
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Full Name &bull; Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Engr. Muhammad Talha"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Designation Title *
                    </label>
                    {!isCustomDesignation ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomDesignation(true);
                          setCustomDesignation(regDesignation || '');
                        }}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                      >
                        + Enter Custom
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomDesignation(false);
                        }}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                      >
                        &larr; Standard Options
                      </button>
                    )}
                  </div>

                  {!isCustomDesignation ? (
                    <div className="space-y-1.5">
                      <select
                        required
                        value={
                          STANDARD_DESIGNATION_OPTIONS.includes(regDesignation as any)
                            ? regDesignation
                            : regDesignation
                            ? 'CUSTOM'
                            : ''
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'CUSTOM') {
                            setIsCustomDesignation(true);
                            setCustomDesignation(regDesignation || '');
                          } else {
                            setRegDesignation(val);
                          }
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden font-medium"
                      >
                        <option value="">-- Select Designation Title --</option>
                        <option value="Lecturer">Lecturer</option>
                        <option value="Assistant Professor">Assistant Professor</option>
                        <option value="Associate Professor">Associate Professor</option>
                        <option value="Professor">Professor</option>
                        <option value="Visiting Lecturer">Visiting Lecturer</option>
                        <option value="Program Coordinator">Program Coordinator</option>
                        <option value="Head of Department (HOD)">Head of Department (HOD)</option>
                        <option value="CUSTOM">Other / Custom Designation...</option>
                      </select>

                      {/* Quick 1-click selection chips for academic ranks */}
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {['Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor', 'Visiting Lecturer'].map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              setRegDesignation(d);
                              setIsCustomDesignation(false);
                            }}
                            className={`text-[10px] px-2 py-0.5 rounded border transition-all cursor-pointer ${
                              regDesignation === d
                                ? 'bg-emerald-700 text-white border-emerald-800 font-bold shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <input
                        type="text"
                        required
                        autoFocus
                        value={customDesignation}
                        onChange={(e) => {
                          setCustomDesignation(e.target.value);
                          setRegDesignation(e.target.value);
                        }}
                        placeholder="e.g. Lab Instructor, Dean, Adjunct Faculty"
                        className="w-full px-3 py-2 bg-white border border-emerald-500 ring-2 ring-emerald-500/20 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden font-medium"
                      />
                      <p className="text-[11px] text-slate-500">
                        Type any custom academic or administrative designation title.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Email Address for Password Recovery */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Official / Notification Email <span className="text-emerald-700 font-normal">(Used for Password Recovery)</span> *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRegEmail(val);
                      if (useEmailAsUsername) {
                        setRegUsername(val);
                      }
                    }}
                    placeholder="e.g. your_email@mnsuet.edu.pk"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  University Department *
                </label>
                <select
                  value={regDepartment}
                  onChange={(e) => handleDepartmentSelection(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden font-medium"
                >
                  {UNIVERSITY_DEPARTMENTS.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              {regRole !== 'HOD' && (
                <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-lg space-y-1.5">
                  <label className="block text-xs font-bold text-teal-900 uppercase tracking-wider">
                    Assigned Degree Program *
                  </label>
                  <select
                    value={regProgram}
                    onChange={(e) => setRegProgram(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  >
                    {UNIVERSITY_DEPARTMENTS.find((d) => d.name === regDepartment)?.programs.map((prog) => (
                      <option key={prog.name} value={prog.name}>
                        {prog.name} ({prog.degreeLevel})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500 block">
                    Your assigned courses and header badges will reflect this degree program.
                  </span>
                </div>
              )}

              {/* Username / Login ID */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Username / Login ID *
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-emerald-800 select-none hover:text-emerald-950">
                    <input
                      type="checkbox"
                      checked={useEmailAsUsername}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUseEmailAsUsername(checked);
                        if (checked && regEmail) {
                          setRegUsername(regEmail);
                        }
                      }}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    <span>Use Email as Username</span>
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    readOnly={useEmailAsUsername}
                    value={useEmailAsUsername ? (regEmail || '') : regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder={useEmailAsUsername ? 'Using your official email as login username' : 'e.g. username or coordinator_ai'}
                    className={`w-full px-3 py-2 border rounded-lg text-sm font-mono outline-hidden transition-all ${
                      useEmailAsUsername
                        ? 'bg-slate-50 text-slate-700 border-slate-200 cursor-not-allowed font-medium'
                        : 'bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600'
                    }`}
                  />
                  {useEmailAsUsername && (
                    <span className="absolute right-2.5 top-2 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded">
                      Email Synced
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {useEmailAsUsername
                    ? 'Your official email address is used directly as your login username.'
                    : 'Custom username for portal login. You can also sign in with your email anytime.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Password *
                  </label>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden font-mono"
                  />
                  {regPassword && (
                    <div className="mt-1 text-[11px] flex items-center justify-between">
                      <span className="text-slate-500">Strength:</span>
                      <span
                        className={`font-bold ${
                          regPassStrength.level === 'Weak'
                            ? 'text-rose-600'
                            : regPassStrength.level === 'Moderate'
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {regPassStrength.level}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="show-reg-pass"
                  checked={showRegPassword}
                  onChange={(e) => setShowRegPassword(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="show-reg-pass" className="text-xs text-slate-600 cursor-pointer">
                  Show passwords
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold rounded-lg text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? 'Registering...' : 'Create Account & Access Monitoring Portal'}</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: FORGOT PASSWORD RECOVERY WORKFLOW */}
        {tab === 'FORGOT_PASSWORD' && (
          <div className="p-6 sm:p-8 space-y-6">
            {/* Step Progress Indicators */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  forgotStep >= 1 ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  1
                </span>
                <span className={`text-xs font-bold ${forgotStep === 1 ? 'text-emerald-900' : 'text-slate-500'}`}>
                  Enter Registered Email
                </span>
              </div>
              <span className="text-slate-300">&rarr;</span>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  forgotStep >= 2 ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  2
                </span>
                <span className={`text-xs font-bold ${forgotStep === 2 ? 'text-emerald-900' : 'text-slate-500'}`}>
                  Email OTP Code
                </span>
              </div>
              <span className="text-slate-300">&rarr;</span>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  forgotStep >= 3 ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  3
                </span>
                <span className={`text-xs font-bold ${forgotStep === 3 ? 'text-emerald-900' : 'text-slate-500'}`}>
                  New Password
                </span>
              </div>
            </div>

            {/* STEP 1: Enter email compulsory */}
            {forgotStep === 1 && (
              <form onSubmit={handleForgotStep1Submit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Registered Email Address (Compulsory) *
                    </label>
                    <span className="text-[10px] font-bold text-rose-600 uppercase bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      Compulsory
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    Email address is compulsory for password recovery. Enter the official institutional email address registered with your MNS-UET account to receive your 6-digit one-time verification code.
                  </p>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      placeholder="e.g. your_email@mnsuet.edu.pk"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Sending Security Code...' : 'Send Verification Code via Email'}</span>
                </button>
              </form>
            )}

            {/* STEP 2: Enter 6-digit OTP code */}
            {forgotStep === 2 && (
              <form onSubmit={handleForgotStep2Submit} className="space-y-4">
                {/* Secure Email Sent Confirmation Box */}
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-emerald-800 font-bold flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-emerald-600" />
                      Verification Code Sent to Email
                    </span>
                    {emailSentTimestamp && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-mono font-semibold">
                        {emailSentTimestamp}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    A 6-digit one-time verification code has been dispatched to your registered email address:
                    <strong className="block font-mono text-emerald-900 font-bold text-sm mt-1 break-all">
                      {targetEmail}
                    </strong>
                  </p>

                  <div className="text-[11px] text-slate-600 border-t border-emerald-200/80 pt-2 flex items-center justify-between gap-2">
                    <span>Please check your inbox & spam folder.</span>
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendCooldown > 0}
                      className="text-emerald-700 hover:text-emerald-800 font-bold disabled:text-slate-400 cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <RefreshCw className={`w-3 h-3 ${resendCooldown > 0 ? 'animate-spin' : ''}`} />
                      <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Enter 6-Digit Verification Code *
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    Enter the code received in your email inbox to verify your identity:
                  </p>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Enter 6-digit code (e.g. 123456)"
                    className="w-full px-4 py-3 bg-white border-2 border-emerald-600 rounded-lg text-center text-2xl font-mono font-bold tracking-widest text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden shadow-xs"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep(1);
                      setEnteredOtp('');
                    }}
                    className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Change Email
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || enteredOtp.length !== 6}
                    className="w-2/3 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold rounded-lg text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmitting ? 'Verifying...' : 'Verify Security Code'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Set New Password */}
            {forgotStep === 3 && (
              <form onSubmit={handleForgotStep3Submit} className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                  <span className="font-bold block">Email Verified Successfully</span>
                  <span>Please choose a strong, new password for your account.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {newPassword && (
                    <div className="mt-1 text-[11px] flex items-center justify-between">
                      <span className="text-slate-500">Strength:</span>
                      <span
                        className={`font-bold ${
                          newPassStrength.level === 'Weak'
                            ? 'text-rose-600'
                            : newPassStrength.level === 'Moderate'
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {newPassStrength.level} ({newPassStrength.message})
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isSubmitting ? 'Updating Password...' : 'Save New Password & Return to Login'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 text-center text-xs text-slate-500">
          <span>Official Central Monitoring Portal of MNS-UET Multan &bull; Anti-Hacking &amp; Brute-Force Protected</span>
        </div>
      </div>
    </div>
  );
};
