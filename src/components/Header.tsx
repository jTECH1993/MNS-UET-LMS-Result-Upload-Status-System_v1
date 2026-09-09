import React from 'react';
import {
  FileText,
  BarChart3,
  Database,
  Building,
  User,
  ShieldCheck,
  Edit2,
  Calendar,
  Layers,
} from 'lucide-react';
import { ActiveUserSession } from '../types';
import { MnsUetLogo } from './MnsUetLogo';

interface Props {
  activeView: 'HOD' | 'VC';
  onViewChange: (view: 'HOD' | 'VC') => void;
  onOpenFirebaseModal: () => void;
  onOpenUserModal: () => void;
  currentUser: ActiveUserSession;
  savedCount: number;
  currentSession?: string;
  currentSemester?: string;
}

export const Header: React.FC<Props> = ({
  activeView,
  onViewChange,
  onOpenFirebaseModal,
  onOpenUserModal,
  currentUser,
  savedCount,
  currentSession = '2023',
  currentSemester = '1',
}) => {
  return (
    <header className="bg-white border-b border-slate-300 shadow-xs sticky top-0 z-30">
      {/* Top Emerald Brand Stripe */}
      <div className="bg-emerald-800 text-emerald-100 text-[11px] font-medium py-1 px-4 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>
            Official Portal • Academic Session {currentSession} – Semester {currentSemester} Results System
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          {/* User Identification Traceability Pill */}
          <button
            type="button"
            onClick={onOpenUserModal}
            className="flex items-center gap-1.5 bg-emerald-900/90 hover:bg-emerald-950 text-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-600/60 transition-colors cursor-pointer"
            title="Click to change your HOD or Coordinator identity"
          >
            <ShieldCheck className="w-3 h-3 text-emerald-300" />
            <span>Traceability:</span>
            <strong className="text-white underline decoration-emerald-400 underline-offset-2">
              {currentUser.name}
            </strong>
            <span className="text-emerald-300 text-[10px]">({currentUser.designation})</span>
            <Edit2 className="w-2.5 h-2.5 ml-0.5 opacity-75" />
          </button>
          <span className="text-emerald-400 hidden sm:inline">|</span>
          <span className="hidden sm:inline font-semibold text-white">MNS-UET Multan</span>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* University Crest & Titles */}
        <div className="flex items-center gap-3.5">
          {/* Official University Crest Logo */}
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
            <p className="text-[11px] text-slate-500 font-normal">
              University-wide HOD / Program Coordinator Submission Interface
            </p>
          </div>
        </div>

        {/* View Switcher & Action Tools */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-lg border border-slate-300 flex items-center shadow-2xs">
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

          {/* Database / Cloud architecture dialog */}
          <button
            id="btn-open-firebase-architecture"
            type="button"
            onClick={onOpenFirebaseModal}
            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Inspect Database Connection, Audit Logs & Clean Reset"
          >
            <Database className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden sm:inline">Database:</span>
            <span className="text-emerald-700 font-bold">Active</span>
          </button>
        </div>
      </div>
    </header>
  );
};
