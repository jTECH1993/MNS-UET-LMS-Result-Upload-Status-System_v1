import React, { useState } from 'react';
import { MnsUetLogo } from './MnsUetLogo';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import { AuthService } from '../services/authService';
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
} from 'lucide-react';

interface Props {
  onAuthenticated: (session: ActiveUserSession) => void;
}

export const AuthScreen: React.FC<Props> = ({ onAuthenticated }) => {
  const [tab, setTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [regRole, setRegRole] = useState<'COORDINATOR' | 'HOD' | 'LECTURER' | 'VISITING_LECTURER'>('COORDINATOR');
  const [regName, setRegName] = useState('');
  const [regDepartment, setRegDepartment] = useState(UNIVERSITY_DEPARTMENTS[0].name);
  const [regProgram, setRegProgram] = useState<string>(() => {
    const dept0 = UNIVERSITY_DEPARTMENTS[0];
    return dept0.programs[0]?.name || 'BS Artificial Intelligence';
  });
  const [regDesignation, setRegDesignation] = useState('Program Coordinator');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Status feedback
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleSelection = (newRole: 'COORDINATOR' | 'HOD' | 'LECTURER' | 'VISITING_LECTURER') => {
    setRegRole(newRole);
    if (newRole === 'COORDINATOR') {
      setRegDesignation('Program Coordinator');
    } else if (newRole === 'HOD') {
      setRegDesignation('Head of Department (HOD)');
    } else if (newRole === 'LECTURER') {
      setRegDesignation('Lecturer');
    } else if (newRole === 'VISITING_LECTURER') {
      setRegDesignation('Visiting Lecturer');
    }
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
    setIsSubmitting(true);

    const result = AuthService.login(loginUsername, loginPassword);
    setIsSubmitting(false);

    if (result.success && result.session) {
      setSuccessMessage(result.message);
      setTimeout(() => {
        onAuthenticated(result.session!);
      }, 300);
    } else {
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

    setIsSubmitting(true);
    const result = AuthService.registerAccount({
      name: regName,
      department: regDepartment,
      designation: regDesignation,
      username: regUsername,
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
              <span className="inline-block bg-emerald-800/80 text-emerald-200 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-600/50 mb-1">
                University Institutional Portal
              </span>
              <h1 className="text-lg sm:text-xl font-black text-white leading-tight">
                Muhammad Nawaz Sharif UET Multan
              </h1>
              <p className="text-xs text-emerald-300 font-medium">
                LMS Result Upload Status • Secure Authentication Gateway
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
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

        {/* Alerts */}
        {errorMessage && (
          <div className="m-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Authentication Error</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="m-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Success</p>
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
                  Username or Institutional Email
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
                    placeholder="Enter your username or email"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password
                </label>
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
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold rounded-lg text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Portal'}</span>
              </button>
            </form>
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
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs block">Head of Department (HOD)</span>
                      <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                        Department-wide oversight & all programs
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleSelection('LECTURER')}
                    className={`py-2 px-3 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      regRole === 'LECTURER'
                        ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-500/30 text-sky-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-1.5 rounded-md shrink-0 ${regRole === 'LECTURER' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs block">Lecturer (Regular)</span>
                      <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                        Permanent faculty member & course instructor
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
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs block">Visiting Lecturer</span>
                      <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                        Visiting faculty & contracted course instructor
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Full Name & Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Dr. Muhammad Tariq"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Official Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={regDesignation}
                    onChange={(e) => setRegDesignation(e.target.value)}
                    placeholder="e.g. Program Coordinator / Lecturer"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Academic Department (Locked to your account) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building className="w-4 h-4" />
                  </div>
                  <select
                    required
                    value={regDepartment}
                    onChange={(e) => handleDepartmentSelection(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden font-medium"
                  >
                    {UNIVERSITY_DEPARTMENTS.map((dept) => (
                      <option key={dept.name} value={dept.name}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* If not HOD: Choose primary Degree Program (e.g. BS AI) */}
              {regRole !== 'HOD' && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 animate-in fade-in">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    {regRole === 'COORDINATOR' ? 'Coordinated Degree Program *' : 'Primary Teaching Degree Program *'}
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

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Username or Institutional Email *
                </label>
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="e.g. hod_civil or tariq@mnsuet.edu.pk"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden font-mono"
                />
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
                    placeholder="At least 4 characters"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden font-mono"
                  />
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
                <span>{isSubmitting ? 'Registering...' : 'Create Account & Access Department'}</span>
              </button>
            </form>
          </div>
        )}

        {/* Footer info */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 text-center text-xs text-slate-500">
          <span>Official Portal of MNS-UET Multan • Data is encrypted and securely stored.</span>
        </div>
      </div>
    </div>
  );
};
