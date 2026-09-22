import React, { useState, useEffect } from 'react';
import { LogOut, Sun, Moon, User, Users, Database, Palette, Menu, FileText, BarChart3, RefreshCw, Activity } from 'lucide-react';
import { ActiveUserSession, AppTheme } from '../types';
import { AuthService } from '../services/authService';
import { MnsUetLogo } from './MnsUetLogo';

interface Props {
  currentUser: ActiveUserSession;
  onLogout: () => void;
  onOpenProfileModal: () => void;
  onOpenUserAccountsModal?: () => void;
  onOpenFirebaseModal?: () => void;
  onOpenDataMigrationModal?: () => void;
  onOpenUsageModal?: () => void;
  savedCount?: number;
  currentSession?: string;
  currentSemester?: string;
  onToggleMobileSidebar?: () => void;
  activeView?: "VC" | "HOD"; onViewChange?: (v: "VC" | "HOD") => void; activeModule?: 'LMS' | 'WORK_ON_DEMAND';
  isAutoRefreshEnabled?: boolean;
  onToggleAutoRefresh?: (enabled: boolean) => void;
  onManualRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<Props> = ({
  currentUser,
  onLogout,
  onOpenProfileModal,
  onOpenUserAccountsModal,
  onOpenFirebaseModal,
  onOpenDataMigrationModal,
  onOpenUsageModal,
  savedCount = 0,
  currentSession = '2023',
  currentSemester = '1',
  onToggleMobileSidebar,
  activeModule = 'LMS',
  isAutoRefreshEnabled = true,
  onToggleAutoRefresh,
  onManualRefresh,
  isRefreshing = false,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvt = e as CustomEvent<{ theme: AppTheme }>;
      if (customEvt.detail?.theme) {
        const def = AuthService.getThemeDefinition(customEvt.detail.theme);
        setIsDark(def.isDark);
      }
    };
    window.addEventListener('mnsuet_theme_changed', handleThemeChange);
    return () => {
      window.removeEventListener('mnsuet_theme_changed', handleThemeChange);
    };
  }, []);

  const isAdmin = currentUser.role === 'ADMIN';
  const isVC = currentUser.role === 'VC';
  const isLecturer = currentUser.role === 'LECTURER';
  const isVisitingLecturer = currentUser.role === 'VISITING_LECTURER';
  const isCoordinator =
    currentUser.role === 'COORDINATOR' ||
    (!isLecturer &&
      !isVisitingLecturer &&
      (Boolean(currentUser.program) ||
        (currentUser.designation && currentUser.designation.toLowerCase().includes('coordinator'))));

  const getRoleBadge = () => {
    if (isAdmin) return { label: 'Admin', cls: 'bg-rose-600 text-white' };
    if (isVC) return { label: 'VC', cls: 'bg-indigo-600 text-white' };
    if (isLecturer) return { label: 'Lecturer', cls: 'bg-sky-600 text-white shadow-2xs' };
    if (isVisitingLecturer) return { label: 'Visiting Lect.', cls: 'bg-orange-600 text-white shadow-2xs' };
    if (isCoordinator) return { label: 'COORD', cls: 'bg-emerald-600 text-white shadow-2xs' };
    return { label: 'HOD', cls: 'bg-emerald-600 text-white shadow-2xs' };
  };
  const badgeInfo = getRoleBadge();

  const handleToggleTheme = () => {
    const newTheme = AuthService.toggleTheme(currentUser.id);
    const def = AuthService.getThemeDefinition(newTheme);
    setIsDark(def.isDark);
  };

  const getInitials = (nameStr: string) => {
    const parts = (nameStr || '').trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (nameStr || 'U').substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 shadow-xs sticky top-0 z-30 transition-colors w-full overflow-hidden">
      <div className="bg-emerald-900 dark:bg-emerald-950 px-3 py-1 flex flex-wrap items-center justify-between gap-2 shadow-inner">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
            <span className="text-[10px] sm:text-xs font-semibold text-emerald-100 tracking-wide">
              MNS-UET Multan • Session {currentSession} – Semester {currentSemester}
            </span>
          </div>

          {/* User-controlled Live Auto-Refresh Toggle */}
          <div className="flex items-center gap-1.5 bg-emerald-950/90 px-2 py-0.5 rounded-full border border-emerald-600/60 text-emerald-100 text-[10px] sm:text-[11px] shadow-2xs">
            <label className="flex items-center gap-1.5 cursor-pointer font-bold select-none" title="Toggle automatic 10-second polling of the database">
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-100">
                Live Auto-Refresh
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isAutoRefreshEnabled}
                onClick={() => onToggleAutoRefresh?.(!isAutoRefreshEnabled)}
                className={`relative inline-flex h-4 w-7 sm:h-4.5 sm:w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isAutoRefreshEnabled ? 'bg-emerald-400' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3 w-3 sm:h-3.5 sm:w-3.5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isAutoRefreshEnabled ? 'translate-x-3 sm:translate-x-3.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </label>
            {isAutoRefreshEnabled ? (
              <span className="flex items-center gap-1 text-[9px] font-mono font-black bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                10s
              </span>
            ) : (
              <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                OFF
              </span>
            )}
          </div>

          {/* Manual Refresh Data Button when Live Auto-Refresh is disabled */}
          {!isAutoRefreshEnabled && (
            <button
              type="button"
              onClick={onManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1 sm:gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 px-2.5 py-0.5 sm:px-3 rounded-full border border-amber-500 text-[10px] sm:text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
              title="Click to manually fetch latest database updates and control data usage"
            >
              <RefreshCw className={`w-3 h-3 text-slate-950 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh Data'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 text-[11px]">
          <button onClick={handleToggleTheme} className="flex items-center gap-1.5 bg-emerald-950/90 hover:bg-emerald-800 text-emerald-100 px-2 py-0.5 rounded-full border border-emerald-600/60 transition-all cursor-pointer font-medium">
            {isDark ? (<><Sun className="w-3.5 h-3.5 text-amber-400" /><span className="text-amber-300 font-semibold hidden sm:inline">Day</span></>) : (<><Moon className="w-3.5 h-3.5 text-indigo-300" /><span className="text-indigo-200 font-semibold hidden sm:inline">Night</span></>)}
          </button>
          <button onClick={onOpenProfileModal} className="flex items-center gap-1.5 bg-emerald-950/90 hover:bg-emerald-800 text-emerald-100 px-1.5 py-0.5 sm:px-2 rounded-full border border-emerald-600/60 transition-all cursor-pointer active:scale-95 text-left">
            {currentUser.avatarUrl ? (<img src={currentUser.avatarUrl} alt={currentUser.name} className="w-4 h-4 rounded-full object-cover border border-emerald-400 shrink-0" />) : (<div className="w-4 h-4 rounded-full bg-emerald-700 flex items-center justify-center text-[9px] font-bold text-white shrink-0 border border-emerald-500">{getInitials(currentUser.name)}</div>)}
            <strong className="text-white font-bold max-w-[100px] sm:max-w-[180px] truncate">{currentUser.name}</strong>
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold uppercase ${badgeInfo.cls}`}>{badgeInfo.label}</span>
          </button>
          <button onClick={onLogout} className="hidden sm:flex items-center gap-1.5 bg-rose-900/80 hover:bg-rose-800 text-rose-100 px-2 py-0.5 rounded-full border border-rose-700/60 transition-colors cursor-pointer font-bold ml-1" title="Sign out of your session"><LogOut className="w-3.5 h-3.5 text-rose-300" /><span className="hidden xl:inline">Sign Out</span></button>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
          {onToggleMobileSidebar && (
            <button onClick={onToggleMobileSidebar} className="p-1.5 -ml-1.5 sm:hidden text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><Menu className="w-5 h-5" /></button>
          )}
          <MnsUetLogo className="w-11 h-11 sm:w-14 sm:h-14" />
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-black tracking-tight text-slate-900 dark:text-white leading-snug uppercase line-clamp-2 sm:line-clamp-none">MNS University of Engineering &amp; Technology, Multan</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5 sm:mt-1">
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-400 tracking-wide uppercase">CENTRAL MONITORING PORTAL</span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-600">|</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Task: {activeModule === 'LMS' ? 'LMS Result Upload Status' : 'Work on Demand Logs'}</span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-600">|</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"><FileText className="w-3 h-3 text-slate-400" />SESSION {currentSession}</span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-600">|</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"><FileText className="w-3 h-3 text-slate-400" />SEMESTER {currentSemester}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 sm:mt-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[10px] sm:text-[11px] font-semibold text-indigo-800 dark:text-indigo-300 truncate max-w-[200px] sm:max-w-md">{currentUser.department} {currentUser.program ? `• ${currentUser.program}` : ''}</span>
            </div>
          </div>
        </div>

        <div className="hidden md:flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            {!isAutoRefreshEnabled && (
              <button
                type="button"
                onClick={onManualRefresh}
                disabled={isRefreshing}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-lg border border-amber-600 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-60 mr-1"
                title="Manual Data Sync (Auto-Refresh Disabled)"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-950 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Syncing...' : 'Refresh Data'}</span>
              </button>
            )}

            {isVC && (
              <div className="flex items-center gap-2 mr-2">
                <button type="button" className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 shadow-2xs">
                  <BarChart3 className="w-4 h-4" />
                  <span>Executive / VC Dashboard</span>
                  <span className="ml-1 bg-indigo-600 text-white px-1.5 py-0.5 rounded-full text-[10px]">{savedCount}</span>
                </button>
              </div>
            )}
            
            <button onClick={onOpenProfileModal} className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors"><User className="w-3.5 h-3.5" />Profile</button>
            {isAdmin && onOpenUserAccountsModal && (<button onClick={onOpenUserAccountsModal} className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors"><Users className="w-3.5 h-3.5" />Accounts</button>)}
            {isAdmin && onOpenUsageModal && (
              <button
                onClick={onOpenUsageModal}
                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-xs font-semibold rounded-lg border border-amber-300 dark:border-amber-800 flex items-center gap-1.5 shadow-2xs transition-colors"
                title="Firestore Real-time Usage & Daily Quota Dashboard"
              >
                <Activity className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Usage & Quota</span>
              </button>
            )}
            {isAdmin && onOpenFirebaseModal && (<button onClick={onOpenFirebaseModal} className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 text-xs font-semibold rounded-lg border border-red-300 dark:border-red-900 flex items-center gap-1.5 shadow-2xs"><Database className="w-3.5 h-3.5" />DB Admin</button>)}
            {isAdmin && onOpenDataMigrationModal && (<button onClick={onOpenDataMigrationModal} className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-900 flex items-center gap-1.5 shadow-2xs" title="Institutional Data Migration & Correction"><RefreshCw className="w-3.5 h-3.5" />Migration Tool</button>)}
            
            <button onClick={handleToggleTheme} className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors">{isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}</button>
            <button onClick={onLogout} className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-200 text-xs font-bold rounded-lg border border-rose-300 dark:border-rose-800 flex items-center gap-1.5 shadow-2xs transition-all"><LogOut className="w-3.5 h-3.5" />Sign Out</button>
          </div>
        </div>

        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"><Menu className="w-5 h-5" /></button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 px-4 py-3 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 px-1 font-medium">
            <span>Session: <strong>{currentSession}</strong></span>
            <span>Saved Records: <strong>{savedCount}</strong></span>
          </div>

          <div className="p-2.5 rounded-lg bg-emerald-950/90 border border-emerald-800 text-xs text-emerald-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold">Live Auto-Refresh (10s)</span>
              <button
                type="button"
                role="switch"
                aria-checked={isAutoRefreshEnabled}
                onClick={() => onToggleAutoRefresh?.(!isAutoRefreshEnabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isAutoRefreshEnabled ? 'bg-emerald-400' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isAutoRefreshEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {!isAutoRefreshEnabled && (
              <button
                type="button"
                onClick={onManualRefresh}
                disabled={isRefreshing}
                className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded flex items-center gap-1 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            )}
          </div>

          {isAdmin && onOpenUsageModal && (
            <button
              onClick={() => {
                onOpenUsageModal();
                setMobileMenuOpen(false);
              }}
              className="w-full py-2 px-3 rounded-lg bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center justify-center gap-2 shadow-2xs"
            >
              <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Firestore Quota &amp; Usage</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button onClick={onOpenProfileModal} className="py-2 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5"><User className="w-3.5 h-3.5" /> Edit Profile</button>
            <button onClick={handleToggleTheme} className="py-2 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5">{isDark ? <><Sun className="w-3.5 h-3.5 text-amber-500" />Day Mode</> : <><Moon className="w-3.5 h-3.5 text-indigo-500" />Night Mode</>}</button>
          </div>
          <button onClick={onLogout} className="w-full py-2.5 rounded-lg bg-rose-600 text-white text-xs font-bold flex items-center justify-center gap-2"><LogOut className="w-4 h-4" /> Sign Out</button>
        </div>
      )}
    </header>
  );
};
