import React, { useState, useEffect } from 'react';
import {
  FileText,
  BarChart3,
  Database,
  Building,
  User,
  ShieldCheck,
  Calendar,
  Layers,
  LogOut,
  Users,
  Lock,
  Sun,
  Moon,
  UserCheck,
  Camera,
  GraduationCap,
} from 'lucide-react';
import { ActiveUserSession } from '../types';
import { AuthService } from '../services/authService';
import { MnsUetLogo } from './MnsUetLogo';

interface Props {
  activeView: 'HOD' | 'VC';
  onViewChange: (view: 'HOD' | 'VC') => void;
  onOpenFirebaseModal: () => void;
  onOpenUserAccountsModal?: () => void;
  onOpenProfileModal: () => void;
  onLogout: () => void;
  currentUser: ActiveUserSession;
  savedCount: number;
  currentSession?: string;
  currentSemester?: string;
}

export const Header: React.FC<Props> = ({
  activeView,
  onViewChange,
  onOpenFirebaseModal,
  onOpenUserAccountsModal,
  onOpenProfileModal,
  onLogout,
  currentUser,
  savedCount,
  currentSession = '2023',
  currentSemester = '1',
}) => {
  const isAdmin = currentUser.role === 'ADMIN';
  const isVC = currentUser.role === 'VC';
  const isCoordinator =
    currentUser.role === 'COORDINATOR' ||
    Boolean(currentUser.program) ||
    (currentUser.designation && currentUser.designation.toLowerCase().includes('coordinator'));
  const isHOD = !isAdmin && !isVC && !isCoordinator;

  const getRoleBadge = () => {
    if (isAdmin) {
      return { label: 'Admin', cls: 'bg-rose-600 text-white' };
    }
    if (isVC) {
      return { label: 'VC', cls: 'bg-indigo-600 text-white' };
    }
    if (isCoordinator) {
      let shortLabel = 'Coordinator';
      if (currentUser.program) {
        const pLower = currentUser.program.toLowerCase();
        if (pLower.includes('artificial intelligence') || pLower.includes('ai')) {
          shortLabel = 'Coord • BS(AI)';
        } else if (pLower.includes('computer science') || pLower.includes('cs')) {
          shortLabel = 'Coord • BS(CS)';
        } else if (pLower.includes('software engineering') || pLower.includes('se')) {
          shortLabel = 'Coord • BS(SE)';
        } else if (pLower.includes('data science') || pLower.includes('ds')) {
          shortLabel = 'Coord • BS(DS)';
        } else if (pLower.includes('cyber security')) {
          shortLabel = 'Coord • BS(CYS)';
        } else if (pLower.includes('information technology')) {
          shortLabel = 'Coord • BS(IT)';
        } else {
          shortLabel = `Coord • ${currentUser.program.split(' ')[0]}`;
        }
      }
      return { label: shortLabel, cls: 'bg-teal-600 text-white shadow-2xs' };
    }
    return { label: 'HOD', cls: 'bg-emerald-600 text-white' };
  };

  const badgeInfo = getRoleBadge();

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvt = e as CustomEvent<{ theme: 'light' | 'dark' }>;
      setIsDark(customEvt.detail?.theme === 'dark');
    };
    window.addEventListener('mnsuet_theme_changed', handleThemeChange);
    return () => {
      window.removeEventListener('mnsuet_theme_changed', handleThemeChange);
    };
  }, []);

  const handleToggleTheme = () => {
    const newTheme = AuthService.toggleTheme(currentUser.id);
    setIsDark(newTheme === 'dark');
  };

  const handleLogoutClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onLogout();
  };

  const getInitials = (nameStr: string) => {
    const parts = (nameStr || '').trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (nameStr || 'U').substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 shadow-xs sticky top-0 z-30 transition-colors">
      {/* Top Emerald Brand Stripe */}
      <div className="bg-emerald-900 dark:bg-emerald-950 text-emerald-100 text-[11px] font-medium py-1 px-4 flex flex-wrap justify-between items-center gap-2 border-b border-emerald-800/80">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>
            Official Academic Gateway • Academic Session {currentSession} – Semester {currentSemester}
          </span>
        </div>

        {/* Authenticated User Session Pill & Controls */}
        <div className="flex items-center gap-2 text-[11px]">
          {/* Day / Night Mode Fast Switcher */}
          <button
            id="btn-top-theme-toggle"
            type="button"
            onClick={handleToggleTheme}
            className="flex items-center gap-1.5 bg-emerald-950/90 hover:bg-emerald-800 active:bg-emerald-950 text-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-600/60 shadow-2xs transition-all cursor-pointer font-medium"
            title={isDark ? 'Switch to Day Mode (Light)' : 'Switch to Night Mode (Dark)'}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300 font-semibold hidden sm:inline">Day Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-300" />
                <span className="text-indigo-200 font-semibold hidden sm:inline">Night Mode</span>
              </>
            )}
          </button>

          {/* User Account Profile Pill (Clickable) */}
          <button
            id="btn-top-profile"
            type="button"
            onClick={onOpenProfileModal}
            className="flex items-center gap-2 bg-emerald-950/90 hover:bg-emerald-900 active:bg-emerald-950 text-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-600/60 shadow-2xs cursor-pointer transition-all hover:border-emerald-400 group"
            title="Click to edit profile photo, display name, password, and theme"
          >
            {/* Avatar image or initials */}
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-4.5 h-4.5 rounded-full object-cover border border-emerald-400 shrink-0"
              />
            ) : (
              <div className="w-4.5 h-4.5 rounded-full bg-emerald-700 flex items-center justify-center text-[9px] font-bold text-white shrink-0 border border-emerald-500">
                {getInitials(currentUser.name)}
              </div>
            )}
            <span className="text-emerald-300 group-hover:text-emerald-200 hidden xs:inline">Logged in:</span>
            <strong className="text-white font-bold max-w-[130px] sm:max-w-[200px] truncate">
              {currentUser.name}
            </strong>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold uppercase ${badgeInfo.cls}`}
            >
              {badgeInfo.label}
            </span>
          </button>

          {/* Sign Out Button */}
          <button
            id="btn-top-signout"
            type="button"
            onClick={handleLogoutClick}
            className="flex items-center gap-1.5 bg-rose-900/90 hover:bg-rose-800 active:bg-rose-950 text-rose-100 hover:text-white px-3 py-0.5 rounded-full border border-rose-500/70 transition-all cursor-pointer text-[11px] font-semibold shadow-2xs hover:scale-102 active:scale-98"
            title="Sign out of your session"
          >
            <LogOut className="w-3 h-3" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* University Crest & Titles */}
        <div className="flex items-center gap-3.5">
          <div className="shrink-0 flex items-center justify-center p-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs hover:scale-105 transition-transform">
            <MnsUetLogo className="w-13 h-13 sm:w-14 sm:h-14" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white leading-snug uppercase">
              Muhammad Nawaz Sharif University of Engineering & Technology, Multan
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-semibold tracking-wide mt-0.5">
              <span className="text-emerald-800 dark:text-emerald-400 font-bold">LMS RESULT UPLOAD STATUS MONITORING</span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="inline-flex items-center gap-1 text-slate-800 dark:text-slate-200 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                <Calendar className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                SESSION {currentSession}
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="inline-flex items-center gap-1 text-emerald-900 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                <Layers className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                SEMESTER {currentSemester}
              </span>
            </div>
            {isCoordinator && (
              <p className="text-[11px] text-teal-800 dark:text-teal-300 font-medium flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-950/80 text-teal-950 dark:text-teal-200 font-bold border border-teal-300 dark:border-teal-700">
                  <GraduationCap className="w-3 h-3 text-teal-700 dark:text-teal-400" />
                  Program Coordinator
                </span>
                {currentUser.program && (
                  <span className="font-extrabold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                    {currentUser.program}
                  </span>
                )}
                <span className="text-slate-600 dark:text-slate-400">
                  • {currentUser.department}
                </span>
              </p>
            )}
            {isHOD && (
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1 mt-0.5">
                <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 inline" />
                <span>Department Isolation Active:</span>
                <strong className="underline">{currentUser.department}</strong>
              </p>
            )}
            {isAdmin && (
              <p className="text-[11px] text-red-700 dark:text-red-400 font-medium mt-0.5">
                👑 Super Administrator Privileges: Full University & Database Oversight
              </p>
            )}
            {isVC && (
              <p className="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium mt-0.5">
                🎓 Executive Office: Read-Only Oversight of All Academic Programs
              </p>
            )}
          </div>
        </div>

        {/* Action Tools & View Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle: For Admin and VC */}
          {(isAdmin || isVC) && (
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center shadow-2xs">
              {isAdmin && (
                <button
                  id="tab-hod-entry"
                  type="button"
                  onClick={() => onViewChange('HOD')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeView === 'HOD'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  HOD Entry Sheet
                </button>
              )}
              <button
                id="tab-vc-overview"
                type="button"
                onClick={() => onViewChange('VC')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'VC'
                    ? 'bg-slate-900 dark:bg-emerald-800 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Executive / VC Dashboard
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeView === 'VC'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {savedCount}
                </span>
              </button>
            </div>
          )}

          {/* User Profile Button */}
          <button
            id="btn-main-profile-modal"
            type="button"
            onClick={onOpenProfileModal}
            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Adjust profile picture, display name, password, or day/night mode"
          >
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-3.5 h-3.5 rounded-full object-cover"
              />
            ) : (
              <User className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            )}
            <span>Profile</span>
          </button>

          {/* Admin User Management Button */}
          {isAdmin && onOpenUserAccountsModal && (
            <button
              type="button"
              onClick={onOpenUserAccountsModal}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Manage HOD accounts and user access"
            >
              <Users className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>User Accounts</span>
            </button>
          )}

          {/* ONLY ADMIN CAN SEE DATABASE & CLOUD ARCHITECTURE MODAL */}
          {isAdmin && (
            <button
              id="btn-open-firebase-architecture"
              type="button"
              onClick={onOpenFirebaseModal}
              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-800 dark:text-red-300 text-xs font-semibold rounded-lg border border-red-300 dark:border-red-900 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Super Admin: Inspect Database Connection, Audit Logs & Reset"
            >
              <Database className="w-3.5 h-3.5 text-red-700 dark:text-red-400" />
              <span className="hidden sm:inline">Database:</span>
              <span className="text-red-700 dark:text-red-400 font-bold">Admin Only</span>
            </button>
          )}

          {/* Day / Night Toggle In Header */}
          <button
            id="btn-main-theme-toggle"
            type="button"
            onClick={handleToggleTheme}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg border border-slate-300 dark:border-slate-700 shadow-2xs cursor-pointer transition-colors"
            title={isDark ? 'Switch to Day Mode' : 'Switch to Night Mode'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
          </button>

          {/* Prominent Main Navbar Sign Out Button */}
          <button
            id="btn-main-signout"
            type="button"
            onClick={handleLogoutClick}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-200 text-xs font-bold rounded-lg border border-rose-300 dark:border-rose-800 flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-98"
            title="Sign out of your session"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

