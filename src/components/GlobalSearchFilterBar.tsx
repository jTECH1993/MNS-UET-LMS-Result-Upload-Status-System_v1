import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Filter,
  Check,
  Building2,
  BookOpen,
  UserCheck,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Tag,
  RotateCcw,
  ListFilter,
  GraduationCap,
  CheckCircle2,
  Clock,
  AlertCircle,
  Hash,
  Briefcase,
  Eye,
} from 'lucide-react';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import { SubmissionRecord, SubjectRow, AcademicShift } from '../types';
import { StorageService } from '../services/storageService';

export type SearchScope = 'ALL' | 'SUBJECT' | 'CODE' | 'LECTURER' | 'DEPT';

interface GlobalSearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchScope: SearchScope;
  onSearchScopeChange: (scope: SearchScope) => void;
  selectedDeptFilters: string[]; // List of selected department names (empty = ALL)
  onDeptFiltersChange: (depts: string[]) => void;
  selectedSemesters: string[]; // List of selected semesters (empty or ['ALL'] = ALL)
  onSemestersChange: (semesters: string[]) => void;
  selectedShifts: ('Morning' | 'Evening')[];
  onShiftsChange: (shifts: ('Morning' | 'Evening')[]) => void;
  statusFilter: 'ALL' | 'SUBMITTED' | 'PENDING';
  onStatusFilterChange: (status: 'ALL' | 'SUBMITTED' | 'PENDING') => void;
  onlyGenuineSubmissions: boolean;
  onOnlyGenuineChange: (genuine: boolean) => void;
  allRecords: SubmissionRecord[];
  onSelectDepartment?: (deptName: string) => void;
  onSelectCourse?: (
    dept: string,
    prog: string,
    shift: AcademicShift,
    session?: string,
    semester?: string,
    section?: string
  ) => void;
}

export const GlobalSearchFilterBar: React.FC<GlobalSearchFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  searchScope,
  onSearchScopeChange,
  selectedDeptFilters,
  onDeptFiltersChange,
  selectedSemesters,
  onSemestersChange,
  selectedShifts,
  onShiftsChange,
  statusFilter,
  onStatusFilterChange,
  onlyGenuineSubmissions,
  onOnlyGenuineChange,
  allRecords,
  onSelectDepartment,
  onSelectCourse,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showResultsDrawer, setShowResultsDrawer] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut (Ctrl+K or /) to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === '/' && document.activeElement !== inputRef.current) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Department selection handlers
  const isDeptSelected = (deptName: string) => {
    if (selectedDeptFilters.length === 0 || selectedDeptFilters.includes('ALL')) return true;
    return selectedDeptFilters.includes(deptName);
  };

  const toggleDeptFilter = (deptName: string) => {
    if (deptName === 'ALL') {
      onDeptFiltersChange([]);
      return;
    }
    let current = selectedDeptFilters.filter((d) => d !== 'ALL');
    if (current.includes(deptName)) {
      current = current.filter((d) => d !== deptName);
    } else {
      current = [...current, deptName];
    }
    // If all depts selected or none, reset to empty (ALL)
    if (current.length === UNIVERSITY_DEPARTMENTS.length) {
      onDeptFiltersChange([]);
    } else {
      onDeptFiltersChange(current);
    }
  };

  const handleSelectAllDepts = () => onDeptFiltersChange([]);
  const handleClearDepts = () => onDeptFiltersChange([]);

  // Semester selection handlers
  const isSemesterSelected = (sem: string) => {
    if (selectedSemesters.length === 0 || selectedSemesters.includes('ALL')) return true;
    return selectedSemesters.includes(sem);
  };

  const toggleSemesterFilter = (sem: string) => {
    if (sem === 'ALL') {
      onSemestersChange([]);
      return;
    }
    let current = selectedSemesters.filter((s) => s !== 'ALL');
    if (current.includes(sem)) {
      current = current.filter((s) => s !== sem);
    } else {
      current = [...current, sem];
    }
    if (current.length === 8) {
      onSemestersChange([]);
    } else {
      onSemestersChange(current);
    }
  };

  // Shift selection handlers
  const isShiftSelected = (shift: 'Morning' | 'Evening') => {
    if (selectedShifts.length === 0) return true;
    return selectedShifts.includes(shift);
  };

  const toggleShiftFilter = (shift: 'Morning' | 'Evening') => {
    if (selectedShifts.includes(shift)) {
      if (selectedShifts.length === 1) {
        onShiftsChange([]); // toggle back to both
      } else {
        onShiftsChange(selectedShifts.filter((s) => s !== shift));
      }
    } else {
      onShiftsChange([...selectedShifts, shift]);
    }
  };

  // Detailed Course Search Matcher
  const matchedCourseResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];

    const matches: {
      record: SubmissionRecord;
      subject: SubjectRow;
      deptName: string;
      matchField: string;
    }[] = [];

    allRecords.forEach((rec) => {
      // Filter by selected departments if active
      if (selectedDeptFilters.length > 0 && !selectedDeptFilters.includes('ALL')) {
        if (!selectedDeptFilters.includes(rec.department)) return;
      }

      // Filter by semester if active
      if (selectedSemesters.length > 0 && !selectedSemesters.includes('ALL')) {
        const recSem = String(rec.semester || '1').replace(/\D/g, '');
        if (!selectedSemesters.includes(recSem)) return;
      }

      // Filter by shift if active
      if (selectedShifts.length > 0) {
        if (!selectedShifts.includes(rec.shift as any)) return;
      }

      const deptName = rec.department || 'General';

      if (rec.subjects && Array.isArray(rec.subjects)) {
        rec.subjects.forEach((sub) => {
          let isMatch = false;
          let matchField = '';

          const code = (sub.courseCode || '').toLowerCase();
          const title = (sub.subjectTitle || '').toLowerCase();
          const lecturer = (sub.uploadedBy || rec.hodCoordinator || rec.accessedBy || '').toLowerCase();
          const dept = deptName.toLowerCase();

          if (searchScope === 'ALL') {
            if (code.includes(q)) {
              isMatch = true;
              matchField = 'Course Code';
            } else if (title.includes(q)) {
              isMatch = true;
              matchField = 'Subject Title';
            } else if (lecturer.includes(q)) {
              isMatch = true;
              matchField = 'Lecturer Name';
            } else if (dept.includes(q)) {
              isMatch = true;
              matchField = 'Department';
            }
          } else if (searchScope === 'CODE' && code.includes(q)) {
            isMatch = true;
            matchField = 'Course Code';
          } else if (searchScope === 'SUBJECT' && title.includes(q)) {
            isMatch = true;
            matchField = 'Subject Title';
          } else if (searchScope === 'LECTURER' && lecturer.includes(q)) {
            isMatch = true;
            matchField = 'Lecturer Name';
          } else if (searchScope === 'DEPT' && dept.includes(q)) {
            isMatch = true;
            matchField = 'Department';
          }

          if (isMatch) {
            matches.push({ record: rec, subject: sub, deptName, matchField });
          }
        });
      }
    });

    return matches.slice(0, 50); // Cap at top 50 matches for performance
  }, [allRecords, searchQuery, searchScope, selectedDeptFilters, selectedSemesters, selectedShifts]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery.trim().length > 0 ||
      (selectedDeptFilters.length > 0 && !selectedDeptFilters.includes('ALL')) ||
      (selectedSemesters.length > 0 && !selectedSemesters.includes('ALL')) ||
      selectedShifts.length > 0 ||
      statusFilter !== 'ALL' ||
      onlyGenuineSubmissions
    );
  }, [
    searchQuery,
    selectedDeptFilters,
    selectedSemesters,
    selectedShifts,
    statusFilter,
    onlyGenuineSubmissions,
  ]);

  const handleResetAllFilters = () => {
    onSearchChange('');
    onSearchScopeChange('ALL');
    onDeptFiltersChange([]);
    onSemestersChange([]);
    onShiftsChange([]);
    onStatusFilterChange('ALL');
    onOnlyGenuineChange(false);
  };

  return (
    <div
      id="global-search-filter-section"
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md p-4 sm:p-5 space-y-4"
    >
      {/* 1. Global Search Header Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Main Search Input */}
        <div className="relative flex-1">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 flex items-center gap-1.5 pointer-events-none">
            <Search className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>

          <input
            ref={inputRef}
            id="global-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              if (e.target.value.trim().length > 0) setShowResultsDrawer(true);
            }}
            placeholder="Search courses, subjects, or faculty names across active view (e.g. CS-101, Data Structures, Dr. Tariq)..."
            className="w-full pl-10 pr-24 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium transition-all shadow-inner"
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-semibold">
              Ctrl+K
            </kbd>
          </div>
        </div>

        {/* Scope Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none text-xs font-bold shrink-0">
          <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider mr-1 hidden sm:inline">
            Scope:
          </span>
          {[
            { id: 'ALL', label: 'All Fields', icon: Layers },
            { id: 'SUBJECT', label: 'Subject Title', icon: BookOpen },
            { id: 'CODE', label: 'Course Code', icon: Hash },
            { id: 'LECTURER', label: 'Lecturer / Teacher', icon: UserCheck },
            { id: 'DEPT', label: 'Department', icon: Building2 },
          ].map((scope) => {
            const IconComponent = scope.icon;
            const isSelected = searchScope === scope.id;
            return (
              <button
                key={scope.id}
                type="button"
                onClick={() => onSearchScopeChange(scope.id as SearchScope)}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border whitespace-nowrap ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <IconComponent className="w-3.5 h-3.5" />
                <span>{scope.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Search Results Instant Match Summary Counter & Drawer Toggle */}
      {searchQuery.trim().length > 0 && (
        <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Found <strong className="text-indigo-600 dark:text-indigo-400">{matchedCourseResults.length}</strong> matching course records across university departments
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowResultsDrawer((prev) => !prev)}
            className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300 hover:underline flex items-center gap-1 cursor-pointer ml-auto"
          >
            <span>{showResultsDrawer ? 'Hide Detailed Matches' : 'View All Matched Courses'}</span>
            {showResultsDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Expandable Matched Course Rows Drawer */}
      {searchQuery.trim().length > 0 && showResultsDrawer && (
        <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3 max-h-80 overflow-y-auto border border-slate-700 shadow-xl text-xs font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-300 uppercase text-[10px] tracking-wider">
              Live Search Results ({matchedCourseResults.length} Items)
            </span>
            <span className="text-[10px] text-slate-400">Click any department to inspect full details</span>
          </div>

          {matchedCourseResults.length === 0 ? (
            <p className="text-slate-400 py-3 text-center">No individual course subjects found matching &quot;{searchQuery}&quot;.</p>
          ) : (
            <div className="space-y-1.5 divide-y divide-slate-800">
              {matchedCourseResults.map((item, idx) => (
                <div
                  key={`${item.record.id}-${item.subject.courseCode}-${idx}`}
                  className="pt-1.5 first:pt-0 flex flex-wrap items-center justify-between gap-2 hover:bg-slate-800/60 p-1.5 rounded transition-colors"
                >
                  <div className="flex items-center gap-2 font-sans flex-wrap">
                    <span className="px-1.5 py-0.5 bg-indigo-900/80 text-indigo-300 font-bold rounded text-[10px] uppercase font-mono">
                      {item.subject.courseCode || 'N/A'}
                    </span>
                    <span className="font-extrabold text-white text-xs">
                      {item.subject.subjectTitle}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      ({item.record.program} - Sem {item.record.semester} {item.record.shift}{item.record.section ? ` Sec ${item.record.section}` : ''})
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 text-[11px] font-sans flex-wrap">
                    <button
                      type="button"
                      onClick={() => onSelectDepartment?.(item.deptName)}
                      className="text-emerald-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Building2 className="w-3 h-3" />
                      <span>{item.deptName}</span>
                    </button>

                    <span className="text-slate-300 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-amber-400" />
                      <span>{item.subject.uploadedBy || item.record.hodCoordinator || 'Unassigned Lecturer'}</span>
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.subject.status === 'Uploaded'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {item.subject.status || 'Pending'}
                    </span>

                    {onSelectCourse && (
                      <button
                        type="button"
                        onClick={() =>
                          onSelectCourse(
                            item.deptName,
                            item.record.program,
                            item.record.shift as AcademicShift,
                            item.record.session,
                            item.record.semester,
                            item.record.section || 'A'
                          )
                        }
                        className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        title={`Inspect ${item.subject.courseCode || item.subject.subjectTitle} in ${item.record.program}`}
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect Course</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Multi-Select Department Chips Section */}
      <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Department Multi-Select Filter ({selectedDeptFilters.length === 0 ? 'All 10 Selected' : `${selectedDeptFilters.length} Selected`}):
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <button
              type="button"
              onClick={handleSelectAllDepts}
              className={`hover:underline cursor-pointer ${
                selectedDeptFilters.length === 0
                  ? 'text-indigo-600 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              All Departments
            </button>
            {selectedDeptFilters.length > 0 && (
              <button
                type="button"
                onClick={handleClearDepts}
                className="text-rose-600 dark:text-rose-400 hover:underline cursor-pointer ml-1"
              >
                Reset Depts
              </button>
            )}
          </div>
        </div>

        {/* Chips Grid */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onDeptFiltersChange([])}
            className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer border ${
              selectedDeptFilters.length === 0
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
          >
            All Departments ({UNIVERSITY_DEPARTMENTS.length})
          </button>

          {UNIVERSITY_DEPARTMENTS.map((dept) => {
            const selected = isDeptSelected(dept.name) && selectedDeptFilters.length > 0;

            // Calculate department program upload statistics
            const deptProgDetails = dept.programs.map((prog) => ({
              prog,
              detail: StorageService.getProgramSessionDetail(dept.name, prog.name, ['2023'], allRecords),
            }));

            const enrolled = deptProgDetails.filter((d) => d.detail.isApplicableInSelected);
            const activeEvalList = enrolled.length > 0 ? enrolled : deptProgDetails;
            const totalProgsCount = activeEvalList.length;

            const completedProgsCount = activeEvalList.filter((d) => {
              const progRecords = allRecords.filter(
                (r) =>
                  StorageService._isDeptMatch(r.department || '', dept.name) &&
                  StorageService._isProgMatch(r.program || '', d.prog.name)
              );
              if (progRecords.length === 0) return false;
              const totalSubjects = progRecords.reduce((acc, r) => acc + (r.subjects ? r.subjects.length : 0), 0);
              const submittedSubjects = progRecords.reduce(
                (acc, r) => acc + (r.subjects ? r.subjects.filter((s) => s.status === 'Uploaded').length : 0),
                0
              );
              return totalSubjects > 0 && submittedSubjects === totalSubjects;
            }).length;

            const completionPct = totalProgsCount > 0 ? Math.round((completedProgsCount / totalProgsCount) * 100) : 0;

            return (
              <button
                key={dept.name}
                type="button"
                onClick={() => toggleDeptFilter(dept.name)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  selected
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
                title={`${dept.name}: ${completedProgsCount}/${totalProgsCount} programs uploaded (${completionPct}%)`}
              >
                {/* Circular Progress Ring */}
                <div className="relative w-3.5 h-3.5 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 transform -rotate-90" viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="12"
                      r="8.5"
                      className={selected ? "stroke-indigo-300/40" : "stroke-slate-200 dark:stroke-slate-700"}
                      strokeWidth="3"
                      fill="transparent"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="8.5"
                      className={
                        completionPct === 100
                          ? selected ? "stroke-emerald-200" : "stroke-emerald-500"
                          : completionPct > 50
                          ? selected ? "stroke-blue-200" : "stroke-blue-500"
                          : completionPct > 0
                          ? selected ? "stroke-amber-200" : "stroke-amber-500"
                          : selected ? "stroke-indigo-300" : "stroke-slate-300 dark:stroke-slate-600"
                      }
                      strokeWidth="3"
                      strokeDasharray={53.4}
                      strokeDashoffset={53.4 - (53.4 * completionPct) / 100}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                </div>

                <span>{dept.code || dept.name}</span>

                {/* Ratio Badge */}
                <span
                  className={`text-[9px] font-extrabold px-1 rounded-full border ${
                    selected
                      ? 'bg-indigo-700 text-indigo-100 border-indigo-500'
                      : completionPct === 100
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {completedProgsCount}/{totalProgsCount}
                </span>

                {selected && <Check className="w-3 h-3 text-white shrink-0 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Multi-Select Semesters, Shifts, Statuses & Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        {/* Semester Multi-Select Chips */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
            <span>Semester Filter ({selectedSemesters.length === 0 ? 'All 1-8' : `${selectedSemesters.length} Selected`}):</span>
          </span>

          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => onSemestersChange([])}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer border ${
                selectedSemesters.length === 0
                  ? 'bg-emerald-700 text-white border-emerald-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              All
            </button>
            {['1', '2', '3', '4', '5', '6', '7', '8'].map((sem) => {
              const active = isSemesterSelected(sem) && selectedSemesters.length > 0;
              return (
                <button
                  key={`sem-chip-${sem}`}
                  type="button"
                  onClick={() => toggleSemesterFilter(sem)}
                  className={`w-7 h-6 rounded text-[11px] font-bold transition-all cursor-pointer border flex items-center justify-center ${
                    active
                      ? 'bg-emerald-600 text-white border-emerald-700 font-extrabold shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                  }`}
                >
                  S{sem}
                </button>
              );
            })}
          </div>
        </div>

        {/* Shift Multi-Select Chips */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Academic Shift:</span>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onShiftsChange([])}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer border ${
                selectedShifts.length === 0
                  ? 'bg-amber-600 text-white border-amber-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              All Shifts
            </button>
            <button
              type="button"
              onClick={() => toggleShiftFilter('Morning')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer border ${
                selectedShifts.includes('Morning')
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}
            >
              Morning
            </button>
            <button
              type="button"
              onClick={() => toggleShiftFilter('Evening')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer border ${
                selectedShifts.includes('Evening')
                  ? 'bg-purple-600 text-white border-purple-700'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}
            >
              Evening
            </button>
          </div>
        </div>

        {/* Status Filter Chips & Genuine Toggle */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <ListFilter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Submission Status:</span>
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'SUBMITTED', label: 'Submitted' },
              { id: 'PENDING', label: 'Pending' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => onStatusFilterChange(st.id as any)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer border ${
                  statusFilter === st.id
                    ? 'bg-indigo-600 text-white border-indigo-700'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                }`}
              >
                {st.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => onOnlyGenuineChange(!onlyGenuineSubmissions)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer border flex items-center gap-1 ${
                onlyGenuineSubmissions
                  ? 'bg-emerald-800 text-white border-emerald-900'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Genuine Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Active Applied Filters Summary Chips & Reset All */}
      {hasActiveFilters && (
        <div className="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider flex items-center gap-1">
              <Tag className="w-3 h-3 text-indigo-500" />
              <span>Active Filters:</span>
            </span>

            {searchQuery && (
              <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 rounded-full text-xs font-bold border border-indigo-300 dark:border-indigo-800 flex items-center gap-1">
                <span>Query: &quot;{searchQuery}&quot; ({searchScope})</span>
                <button type="button" onClick={() => onSearchChange('')} className="hover:text-indigo-950 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedDeptFilters.length > 0 && !selectedDeptFilters.includes('ALL') && (
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 rounded-full text-xs font-bold border border-blue-300 dark:border-blue-800 flex items-center gap-1">
                <span>Depts ({selectedDeptFilters.length})</span>
                <button type="button" onClick={() => onDeptFiltersChange([])} className="hover:text-blue-950 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedSemesters.length > 0 && !selectedSemesters.includes('ALL') && (
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 rounded-full text-xs font-bold border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <span>Semesters ({selectedSemesters.join(', ')})</span>
                <button type="button" onClick={() => onSemestersChange([])} className="hover:text-emerald-950 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedShifts.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 rounded-full text-xs font-bold border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                <span>Shift ({selectedShifts.join(', ')})</span>
                <button type="button" onClick={() => onShiftsChange([])} className="hover:text-amber-950 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {statusFilter !== 'ALL' && (
              <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 rounded-full text-xs font-bold border border-purple-300 dark:border-purple-800 flex items-center gap-1">
                <span>Status: {statusFilter}</span>
                <button type="button" onClick={() => onStatusFilterChange('ALL')} className="hover:text-purple-950 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {onlyGenuineSubmissions && (
              <span className="px-2 py-0.5 bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-200 rounded-full text-xs font-bold border border-teal-300 dark:border-teal-800 flex items-center gap-1">
                <span>Genuine Only</span>
                <button type="button" onClick={() => onOnlyGenuineChange(false)} className="hover:text-teal-950 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleResetAllFilters}
            className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer ml-auto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All Filters</span>
          </button>
        </div>
      )}
    </div>
  );
};
