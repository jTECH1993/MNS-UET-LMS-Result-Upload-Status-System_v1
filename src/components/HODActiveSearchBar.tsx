import React, { useRef, useEffect } from 'react';
import {
  Search,
  X,
  Layers,
  BookOpen,
  Hash,
  UserCheck,
  Clock,
  ArrowRight,
  Sparkles,
  Filter,
} from 'lucide-react';
import { AcademicShift } from '../types';

export type HODSearchScope = 'ALL' | 'CODE' | 'SUBJECT' | 'FACULTY' | 'PENDING';

export interface OtherCohortMatch {
  semester: string;
  section: string;
  shift: AcademicShift;
  courseCode: string;
  subjectTitle: string;
  faculty: string;
  status: string;
}

interface HODActiveSearchBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchScope: HODSearchScope;
  onSearchScopeChange: (scope: HODSearchScope) => void;
  totalCount: number;
  matchCount: number;
  currentSemester: string;
  currentSection: string;
  currentShift: string;
  otherCohortsMatches?: OtherCohortMatch[];
  onSwitchCohort?: (semester: string, section: string, shift: AcademicShift) => void;
}

export const HODActiveSearchBar: React.FC<HODActiveSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  searchScope,
  onSearchScopeChange,
  totalCount,
  matchCount,
  currentSemester,
  currentSection,
  currentShift,
  otherCohortsMatches = [],
  onSwitchCohort,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+K or '/' to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        if (searchQuery) {
          onSearchChange('');
        } else {
          inputRef.current?.blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery, onSearchChange]);

  const hasFilterActive = searchQuery.trim().length > 0 || searchScope !== 'ALL';

  return (
    <div
      id="hod-active-search-bar"
      className="bg-white rounded-xl border border-slate-200 shadow-xs p-3 sm:p-4 space-y-3"
    >
      {/* Top row: Label & Search Input */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left: Input with icons and clear button */}
        <div className="relative flex-1">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-emerald-600" />
          </div>

          <input
            ref={inputRef}
            id="input-hod-active-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search courses, subjects, or faculty in active view (e.g. CS-101, Data Structures, Dr. Tariq)..."
            className="w-full pl-10 pr-24 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-2xs font-medium"
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                title="Clear search (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-300 rounded font-semibold">
              Ctrl+K
            </kbd>
          </div>
        </div>

        {/* Right: Quick Scope Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none text-xs font-bold shrink-0">
          <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider mr-1 hidden sm:inline flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Scope:
          </span>

          {[
            { id: 'ALL', label: 'All Fields', icon: Layers },
            { id: 'CODE', label: 'Course Code', icon: Hash },
            { id: 'SUBJECT', label: 'Subject Title', icon: BookOpen },
            { id: 'FACULTY', label: 'Faculty / Teacher', icon: UserCheck },
            { id: 'PENDING', label: 'Pending Only', icon: Clock },
          ].map((scope) => {
            const IconComponent = scope.icon;
            const isSelected = searchScope === scope.id;
            return (
              <button
                key={scope.id}
                type="button"
                onClick={() => onSearchScopeChange(scope.id as HODSearchScope)}
                className={`px-2.5 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1 text-[11px] border whitespace-nowrap ${
                  isSelected
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <IconComponent className="w-3 h-3" />
                <span>{scope.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live search feedback strip */}
      {hasFilterActive && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Showing <strong>{matchCount}</strong> of <strong>{totalCount}</strong> courses in active view (Sem {currentSemester}, Sec {currentSection}, {currentShift})
            </span>
            {searchQuery && (
              <span className="text-[11px] text-slate-500">
                Matching: <strong className="text-slate-800 font-semibold">&quot;{searchQuery}&quot;</strong>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              onSearchScopeChange('ALL');
            }}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            <span>Reset Search Filter</span>
          </button>
        </div>
      )}

      {/* Cross-cohort search suggestion banner: if 0 matches in current view but matches found in other semesters/sections */}
      {searchQuery.trim().length >= 2 && matchCount === 0 && otherCohortsMatches.length > 0 && onSwitchCohort && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-900 space-y-1.5 animate-fadeIn">
          <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-800 uppercase tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              Not found in current view (Sem {currentSemester} Sec {currentSection}), but found {otherCohortsMatches.length} matching course(s) in other cohorts of this program:
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {otherCohortsMatches.map((m, idx) => (
              <button
                key={`${m.semester}-${m.section}-${m.shift}-${m.courseCode}-${idx}`}
                type="button"
                onClick={() => onSwitchCohort(m.semester, m.section, m.shift)}
                className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs group"
                title={`Switch to Semester ${m.semester} Section ${m.section} (${m.shift})`}
              >
                <span className="font-mono font-bold text-amber-700">{m.courseCode}</span>
                <span className="text-slate-700 font-medium truncate max-w-[120px]">{m.subjectTitle}</span>
                {m.faculty && <span className="text-slate-500 text-[10px]">({m.faculty})</span>}
                <span className="bg-amber-200/70 text-amber-900 px-1 rounded text-[10px] font-bold">
                  Sem {m.semester} Sec {m.section}
                </span>
                <ArrowRight className="w-3 h-3 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
