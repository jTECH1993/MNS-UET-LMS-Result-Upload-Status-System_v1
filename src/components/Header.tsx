import React from 'react';
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
} from 'lucide-react';
import { ActiveUserSession } from '../types';
import { MnsUetLogo } from './MnsUetLogo';

interface Props {
  activeView: 'HOD' | 'VC';
  onViewChange: (view: 'HOD' | 'VC') => void;
  onOpenFirebaseModal: () => void;
  onOpenUserAccountsModal?: () => void;
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
  onLogout,
  currentUser,
  savedCount,
  currentSession = '2023',
  currentSemester = '1',
}) => {
  const isAdmin = currentUser.role === 'ADMIN';
  const isVC = currentUser.role === 'VC';
  const isHOD = currentUser.role === 'HOD';

  const handleLogoutClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onLogout();
  };

  return (
    <header className="bg-white border-b border-slate-300 shadow-xs sticky top-0 z-30">
      {/* Top Emerald Brand Stripe */}
      <div className="bg-emerald-900 text-emerald-100 text-[11px] font-medium py-1 px-4 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>
            Official Academic Gateway • Academic Session {currentSession} – Semester {currentSemester}
          </span>
        </div>

        {/* Authenticated User Session Pill */}
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-2 bg-emerald-950/90 text-emerald-100 px-3 py-0.5 rounded-full border border-emerald-600/60 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span className="text-emerald-300">Logged in:</span>
            <strong className="text-white font-bold">{currentUser.name}</strong>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold uppercase ${
                isAdmin
                  ? 'bg-rose-600 text-white'
                  : isVC
                  ? 'bg-indigo-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {isAdmin ? 'Super Admin' : isVC ? 'Vice Chancellor' : 'HOD / Coord'}
            </span>
          </div>

          <button
            id="btn-top-signout"
            type="button"
            onClick={handleLogoutClick}
            className="flex items-center gap-1.5 bg-rose-900/90 hover:bg-rose-800 active:bg-rose-950 text-rose-100 hover:text-white px-3 py-0.5 rounded-full border border-rose-500/70 transition-all cursor-pointer text-[11px] font-semibold shadow-2xs hover:scale-102 active:scale-98"
            title="Sign out of your session"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* University Crest & Titles */}
        <div className="flex items-center gap-3.5">
          <div className="shrink-0 flex items-center justify-center p-0.5 rounded-full bg-slate-50 border border-slate-200 shadow-xs hover:scale-105 transition-transform">
            <MnsUetLogo className="w-13 h-13 sm:w-14 sm:h-14" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-snug uppercase">
              Muhammad Nawaz Sharif University of Engineering & Technology, Multan
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-semibold tracking-wide mt-0.5">
              <span className="text-emerald-800 font-bold">LMS RESULT UPLOAD STATUS MONITORING</span>
              <span className="text-slate-300">|</span>
              <span className="inline-flex items-center gap-1 text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                <Calendar className="w-3 h-3 text-emerald-700" />
                SESSION {currentSession}
              </span>
              <span className="text-slate-300">|</span>
              <span className="inline-flex items-center gap-1 text-emerald-900 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                <Layers className="w-3 h-3 text-emerald-700" />
                SEMESTER {currentSemester}
              </span>
            </div>
            {isHOD && (
              <p className="text-[11px] text-emerald-800 font-medium flex items-center gap-1 mt-0.5">
                <Lock className="w-3 h-3 text-emerald-600 inline" />
                <span>Department Isolation Active:</span>
                <strong className="underline">{currentUser.department}</strong>
              </p>
            )}
            {isAdmin && (
              <p className="text-[11px] text-red-700 font-medium mt-0.5">
                👑 Super Administrator Privileges: Full University & Database Oversight
              </p>
            )}
            {isVC && (
              <p className="text-[11px] text-indigo-700 font-medium mt-0.5">
                🎓 Executive Office: Read-Only Oversight of All Academic Programs
              </p>
            )}
          </div>
        </div>

        {/* Action Tools & View Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle: For Admin and VC */}
          {(isAdmin || isVC) && (
            <div className="bg-slate-100 p-1 rounded-lg border border-slate-300 flex items-center shadow-2xs">
              {isAdmin && (
                <button
                  id="tab-hod-entry"
                  type="button"
                  onClick={() => onViewChange('HOD')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeView === 'HOD'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
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
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Executive / VC Dashboard
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeView === 'VC'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {savedCount}
                </span>
              </button>
            </div>
          )}

          {/* Admin User Management Button */}
          {isAdmin && onOpenUserAccountsModal && (
            <button
              type="button"
              onClick={onOpenUserAccountsModal}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Manage HOD accounts and user access"
            >
              <Users className="w-3.5 h-3.5 text-blue-700" />
              <span>User Accounts</span>
            </button>
          )}

          {/* ONLY ADMIN CAN SEE DATABASE & CLOUD ARCHITECTURE MODAL */}
          {isAdmin && (
            <button
              id="btn-open-firebase-architecture"
              type="button"
              onClick={onOpenFirebaseModal}
              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-semibold rounded-lg border border-red-300 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Super Admin: Inspect Database Connection, Audit Logs & Reset"
            >
              <Database className="w-3.5 h-3.5 text-red-700" />
              <span className="hidden sm:inline">Database:</span>
              <span className="text-red-700 font-bold">Admin Only</span>
            </button>
          )}

          {/* Prominent Main Navbar Sign Out Button */}
          <button
            id="btn-main-signout"
            type="button"
            onClick={handleLogoutClick}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-800 text-xs font-bold rounded-lg border border-rose-300 flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-98"
            title="Sign out of your session"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-700" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
