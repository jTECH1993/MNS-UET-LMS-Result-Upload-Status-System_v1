import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  ShieldCheck,
  KeyRound,
  Camera,
  Trash2,
  Sun,
  Moon,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Building,
  Sparkles,
  Upload,
  GraduationCap,
  BookOpen,
  Briefcase,
  Mail,
} from 'lucide-react';
import { ActiveUserSession, UserRole } from '../types';
import { AuthService } from '../services/authService';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ActiveUserSession;
  onUserUpdated: (updatedUser: ActiveUserSession) => void;
}

export const UserProfileModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
}) => {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [designation, setDesignation] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [academicRole, setAcademicRole] = useState<'COORDINATOR' | 'HOD' | 'LECTURER' | 'VISITING_LECTURER'>('COORDINATOR');
  const [program, setProgram] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [themePreference, setThemePreference] = useState<'light' | 'dark'>('light');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMasterAccount = currentUser.role === 'ADMIN' || currentUser.role === 'VC';

  // Helper to retrieve programs list for currently selected department
  const activeDeptGroup = UNIVERSITY_DEPARTMENTS.find((d) => d.name === department) || UNIVERSITY_DEPARTMENTS[0];
  const availablePrograms = activeDeptGroup?.programs || [];

  // Sync state whenever modal opens or currentUser changes
  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setDesignation(currentUser.designation || '');
      setAvatarUrl(currentUser.avatarUrl || '');

      const initialDept = currentUser.department || UNIVERSITY_DEPARTMENTS[0].name;
      setDepartment(initialDept);

      // Determine initial academic role
      if (currentUser.role === 'LECTURER') {
        setAcademicRole('LECTURER');
      } else if (currentUser.role === 'VISITING_LECTURER') {
        setAcademicRole('VISITING_LECTURER');
      } else if (currentUser.role === 'HOD') {
        setAcademicRole('HOD');
      } else {
        setAcademicRole('COORDINATOR');
      }

      // Determine initial program
      const deptGroup = UNIVERSITY_DEPARTMENTS.find((d) => d.name === initialDept) || UNIVERSITY_DEPARTMENTS[0];
      const defaultProg =
        currentUser.program ||
        (initialDept === 'Department of Computer Science'
          ? 'BS Artificial Intelligence'
          : deptGroup?.programs[0]?.name || '');
      setProgram(defaultProg);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMessage(null);
      setSuccessMessage(null);

      // Current theme
      const isDark =
        typeof document !== 'undefined' &&
        document.documentElement.classList.contains('dark');
      setThemePreference(currentUser.themePreference || (isDark ? 'dark' : 'light'));
    }
  }, [isOpen, currentUser]);

  // Handle department change in modal
  const handleDepartmentChange = (newDept: string) => {
    setDepartment(newDept);
    const group = UNIVERSITY_DEPARTMENTS.find((d) => d.name === newDept);
    if (group && group.programs.length > 0) {
      const newDefaultProg = group.programs[0].name;
      setProgram(newDefaultProg);
      if (academicRole === 'COORDINATOR') {
        setDesignation(`Program Coordinator - ${newDefaultProg}`);
      } else if (academicRole === 'LECTURER') {
        setDesignation(`Lecturer - ${newDefaultProg}`);
      } else if (academicRole === 'VISITING_LECTURER') {
        setDesignation(`Visiting Lecturer - ${newDefaultProg}`);
      }
    }
  };

  // Handle role change in modal
  const handleRoleChange = (newRole: 'COORDINATOR' | 'HOD' | 'LECTURER' | 'VISITING_LECTURER') => {
    setAcademicRole(newRole);
    const targetProg = program || activeDeptGroup?.programs[0]?.name || 'BS Artificial Intelligence';
    if (newRole === 'COORDINATOR') {
      setProgram(targetProg);
      setDesignation(`Program Coordinator - ${targetProg}`);
    } else if (newRole === 'HOD') {
      setDesignation(`Head of Department (${activeDeptGroup?.code || 'HOD'})`);
    } else if (newRole === 'LECTURER') {
      setProgram(targetProg);
      setDesignation(`Lecturer - ${targetProg} (${activeDeptGroup?.code || 'Faculty'})`);
    } else if (newRole === 'VISITING_LECTURER') {
      setProgram(targetProg);
      setDesignation(`Visiting Lecturer - ${targetProg} (${activeDeptGroup?.code || 'Visiting Faculty'})`);
    }
  };

  // Handle program selection
  const handleProgramSelect = (newProg: string) => {
    setProgram(newProg);
    if (academicRole === 'COORDINATOR') {
      setDesignation(`Program Coordinator - ${newProg}`);
    } else if (academicRole === 'LECTURER') {
      setDesignation(`Lecturer - ${newProg}`);
    } else if (academicRole === 'VISITING_LECTURER') {
      setDesignation(`Visiting Lecturer - ${newProg}`);
    }
  };

  if (!isOpen) return null;

  // Handle Photo Upload (Convert image to Base64)
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (1.5MB max to keep localStorage lean)
    if (file.size > 1.5 * 1024 * 1024) {
      setErrorMessage('Please select an image smaller than 1.5 MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAvatarUrl(result);
        setErrorMessage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Instant Theme Switcher
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setThemePreference(newTheme);
    AuthService.applyTheme(newTheme);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMessage('Display Name cannot be empty.');
      return;
    }

    // Check password logic
    const isAttemptingPasswordChange = newPassword.trim().length > 0;
    if (isAttemptingPasswordChange) {
      if (!currentPassword.trim()) {
        setErrorMessage('Please enter your Current Password to change your password.');
        return;
      }
      if (newPassword.trim().length < 4) {
        setErrorMessage('New Password must be at least 4 characters long.');
        return;
      }
      if (newPassword.trim() !== confirmPassword.trim()) {
        setErrorMessage('New Password and Confirmation do not match.');
        return;
      }
    }

    setIsSaving(true);

    const result = AuthService.updateProfile(currentUser.id, {
      name: cleanName,
      email: email.trim(),
      designation: designation.trim(),
      avatarUrl: avatarUrl,
      oldPassword: isAttemptingPasswordChange ? currentPassword.trim() : undefined,
      newPassword: isAttemptingPasswordChange ? newPassword.trim() : undefined,
      themePreference: themePreference,
      role: !isMasterAccount ? (academicRole as UserRole) : undefined,
      department: !isMasterAccount ? department : undefined,
      program: !isMasterAccount && academicRole !== 'HOD' ? program : undefined,
    });

    setIsSaving(false);

    if (!result.success) {
      setErrorMessage(result.message);
      return;
    }

    setSuccessMessage('Profile and preferences updated successfully!');
    if (result.session) {
      onUserUpdated(result.session);
    }

    // Auto close after brief confirmation
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // Preset academic avatars
  const presetAvatars = [
    { label: 'VC / Executive', color: 'bg-indigo-700 text-white' },
    { label: 'Dean / Scholar', color: 'bg-emerald-800 text-white' },
    { label: 'Admin / IT', color: 'bg-rose-700 text-white' },
    { label: 'HOD Faculty', color: 'bg-slate-800 text-white' },
  ];

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-emerald-900 dark:bg-emerald-950 text-white flex items-center justify-between border-b border-emerald-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700/80 flex items-center justify-center text-emerald-200">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight text-white">Account Profile & Settings</h3>
              <p className="text-[11px] text-emerald-200">
                Personalize your display identity, avatar photo, theme, & password
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-emerald-200 hover:text-white rounded-lg hover:bg-emerald-800/60 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Status Banners */}
          {errorMessage && (
            <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 p-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 p-3 rounded-lg flex items-start gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          {/* Section 1: Profile Image & Avatar */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-center gap-4">
            {/* Avatar Preview */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-600 dark:border-emerald-500 shadow-md bg-emerald-800 text-white flex items-center justify-center font-bold text-xl">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name || 'Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{getInitials(name || currentUser.username)}</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-md border-2 border-white dark:border-slate-900 transition-transform active:scale-95 cursor-pointer"
                title="Upload Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Avatar Controls */}
            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-[11px] shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer text-[11px] border border-rose-200 dark:border-rose-900"
                    title="Remove custom photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Upload a professional headshot (JPG, PNG, WebP &lt; 1.5MB).
              </p>
            </div>
          </div>

          {/* Section 2: Day / Night Mode Switcher */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                {themePreference === 'dark' ? (
                  <Moon className="w-4 h-4 text-indigo-400" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
                Display Theme (Day / Night Mode)
              </label>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Current: <strong className="text-emerald-700 dark:text-emerald-400 capitalize">{themePreference} Mode</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-2 font-semibold transition-all cursor-pointer ${
                  themePreference === 'light'
                    ? 'bg-white text-slate-900 border-amber-400 shadow-sm ring-2 ring-amber-400/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Day Mode (Light)</span>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-2 font-semibold transition-all cursor-pointer ${
                  themePreference === 'dark'
                    ? 'bg-slate-900 text-white border-indigo-500 shadow-sm ring-2 ring-indigo-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Night Mode (Dark)</span>
              </button>
            </div>
          </div>

          {/* Section 3: Identity & Display Name */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Interface Identity & Academic Role
              </h4>
              {!isMasterAccount && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Personalize Role & Program
                </span>
              )}
            </div>

            {/* If Not Master Admin/VC: Academic Role & Program Selector */}
            {!isMasterAccount && (
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80">
                {/* Role Switcher */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Your Institutional Academic Role <span className="text-rose-600">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      id="btn-role-coordinator"
                      type="button"
                      onClick={() => handleRoleChange('COORDINATOR')}
                      className={`py-2 px-3 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        academicRole === 'COORDINATOR'
                          ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 ring-2 ring-teal-500/30 text-teal-950 dark:text-teal-100 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md shrink-0 ${academicRole === 'COORDINATOR' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-xs block">Program Coordinator</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                          Incharge of specific degree program (e.g. BS AI)
                        </span>
                      </div>
                    </button>

                    <button
                      id="btn-role-hod"
                      type="button"
                      onClick={() => handleRoleChange('HOD')}
                      className={`py-2 px-3 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        academicRole === 'HOD'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-950 dark:text-emerald-100 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md shrink-0 ${academicRole === 'HOD' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                        <Building className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-xs block">Head of Department (HOD)</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                          Department-wide oversight & all programs
                        </span>
                      </div>
                    </button>

                    <button
                      id="btn-role-lecturer"
                      type="button"
                      onClick={() => handleRoleChange('LECTURER')}
                      className={`py-2 px-3 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        academicRole === 'LECTURER'
                          ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 ring-2 ring-sky-500/30 text-sky-950 dark:text-sky-100 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md shrink-0 ${academicRole === 'LECTURER' ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-xs block">Lecturer (Regular)</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                          Permanent faculty member & course incharge
                        </span>
                      </div>
                    </button>

                    <button
                      id="btn-role-visiting"
                      type="button"
                      onClick={() => handleRoleChange('VISITING_LECTURER')}
                      className={`py-2 px-3 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        academicRole === 'VISITING_LECTURER'
                          ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/30 text-amber-950 dark:text-amber-100 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md shrink-0 ${academicRole === 'VISITING_LECTURER' ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-xs block">Visiting Lecturer</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                          Visiting faculty & contracted course instructor
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Academic Department Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Department <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Building className="w-4 h-4" />
                    </div>
                    <select
                      id="select-profile-department"
                      value={department}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    >
                      {UNIVERSITY_DEPARTMENTS.map((dept) => (
                        <option key={dept.name} value={dept.name}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Program Selector (for Coordinator, Lecturer, Visiting Lecturer) */}
                {academicRole !== 'HOD' && (
                  <div className={`p-3 rounded-lg border space-y-2 animate-in fade-in ${
                    academicRole === 'COORDINATOR'
                      ? 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800'
                      : academicRole === 'LECTURER'
                      ? 'bg-sky-50/70 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800'
                      : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        {academicRole === 'COORDINATOR' ? 'Coordinated Degree Program' : 'Primary Teaching Program / Degree'} <span className="text-rose-600">*</span>
                      </label>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                        Programs in {activeDeptGroup.code}
                      </span>
                    </div>

                    <select
                      id="select-profile-program"
                      value={program}
                      onChange={(e) => handleProgramSelect(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600 focus:outline-none shadow-2xs"
                    >
                      {availablePrograms.map((prog) => (
                        <option key={prog.name} value={prog.name}>
                          {prog.name} ({prog.degreeLevel})
                        </option>
                      ))}
                    </select>

                    <div className="flex items-start gap-1.5 text-[11px] text-slate-700 dark:text-slate-300 leading-snug pt-0.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        {academicRole === 'COORDINATOR'
                          ? <>Assigned as <strong>Program Coordinator of {program}</strong>. The university header badge, status bar, and result upload forms will display your coordinated program.</>
                          : academicRole === 'LECTURER'
                          ? <>Configured as <strong>Lecturer ({program})</strong> in {department}. You can filter and manage your assigned LMS course uploads.</>
                          : <>Configured as <strong>Visiting Lecturer ({program})</strong> in {department}. You can filter and update your assigned LMS results.</>
                        }
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Display Name Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Display Name <span className="text-rose-600">*</span>
              </label>
              <input
                id="input-profile-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Muhammad Talha Jahangir"
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-semibold"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                This name appears on the university status bar, result sheets, and signed logs.
              </p>
            </div>

            {/* Designation */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Designation / Academic Title
                </label>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Select or type custom</span>
              </div>
              <input
                id="input-profile-designation"
                type="text"
                list="designation-suggestions"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Assistant Professor, Lecturer"
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
              />
              <datalist id="designation-suggestions">
                <option value="Lecturer" />
                <option value="Assistant Professor" />
                <option value="Associate Professor" />
                <option value="Professor" />
                <option value="Visiting Lecturer" />
                <option value="Program Coordinator" />
                <option value="Head of Department (HOD)" />
              </datalist>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {['Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor', 'Visiting Lecturer'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDesignation(d)}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-all cursor-pointer ${
                      designation === d
                        ? 'bg-emerald-700 text-white border-emerald-800 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Official University Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Official Institutional Email</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Password recovery & notifications</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="input-profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. your_email@mnsuet.edu.pk"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                />
              </div>
            </div>

            {/* Department & Username Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold uppercase">
                  Username
                </span>
                <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                  @{currentUser.username}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold uppercase">
                  Assigned Department
                </span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {!isMasterAccount ? department : currentUser.department}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Security & Password Change */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Change Password
              </h4>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                Leave blank to keep existing password
              </span>
            </div>

            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Current / Old Password
              </label>
              <div className="relative">
                <input
                  id="input-profile-current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password to authorize changes"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white pr-9 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password & Confirm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="input-profile-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 4 characters"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white pr-9 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  id="input-profile-confirm-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-save-profile-settings"
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
