import React, { useState, useMemo } from 'react';
import { UNIVERSITY_DEPARTMENTS, ACADEMIC_SHIFTS, ACADEMIC_SEMESTERS } from '../data/departmentsData';
import { StorageService } from '../services/storageService';
import { SubmissionRecord, AcademicShift } from '../types';
import { Session2023SelectorModal } from './Session2023SelectorModal';
import { AcademicSessionModal } from './AcademicSessionModal';
import { ExecutiveReportModal } from './ExecutiveReportModal';
import { MnsUetLogo } from './MnsUetLogo';
import {
  Building2,
  CheckCircle2,
  Clock,
  Download,
  Search,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
  GraduationCap,
  Filter,
  SlidersHorizontal,
  Sun,
  Moon,
  Calendar,
  Layers,
  Sparkles,
  X,
  FileText,
  Printer,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

interface Props {
  onSelectProgramToEdit: (
    department: string,
    program: string,
    shift?: AcademicShift,
    session?: string,
    semester?: string
  ) => void;
  allRecords: SubmissionRecord[];
}

export interface ShiftCohortData {
  hasSubmission: boolean;
  submittedSemestersCount: number;
  semesterRecords: Record<string, SubmissionRecord | null>;
  totalSubjects: number;
  totalUploaded: number;
  totalPending: number;
  firstSubmittedSemester?: string;
}

export interface UnifiedProgramRow {
  department: string;
  deptCode: string;
  program: string;
  degreeLevel: string;
  sessionActive: boolean;
  shifts: {
    Morning: ShiftCohortData;
    Evening: ShiftCohortData;
  };
  hasMorningSubmission: boolean;
  hasEveningSubmission: boolean;
  hasAnySubmission: boolean;
  recommendedShift: AcademicShift;
}

export const VCDashboard: React.FC<Props> = ({ onSelectProgramToEdit, allRecords }) => {
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<'ALL' | AcademicShift>('ALL');
  // Default to Semester 1 as requested by user so Vice Chancellor genuinely inspects Semester 1 data without clutter
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<string>('1');
  const [currentSession, setCurrentSession] = useState<string>(() => StorageService.getSelectedSession());
  const [isSessionModalOpen, setIsSessionModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'PENDING'>('ALL');
  const [onlySessionFilter, setOnlySessionFilter] = useState<boolean>(true);
  const [onlyGenuineSubmissions, setOnlyGenuineSubmissions] = useState<boolean>(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false);
  const [rosterDept, setRosterDept] = useState<string>(UNIVERSITY_DEPARTMENTS[0].name);
  const [rosterVersion, setRosterVersion] = useState<number>(0);
  const [isExecutiveReportOpen, setIsExecutiveReportOpen] = useState<boolean>(false);

  // Per-row shift selection state (allows user/VC to toggle Morning/Evening on an individual program row)
  const [rowShiftOverrides, setRowShiftOverrides] = useState<Record<string, AcademicShift>>({});

  // Map of submissions by unique key: department__program__shift__session__semester
  const recordMap = useMemo(() => {
    const map = new Map<string, SubmissionRecord>();
    allRecords.forEach((r) => {
      const shiftVal = r.shift || 'Morning';
      const sessVal = r.session || '2023';
      const semVal = r.semester || '1';
      map.set(
        `${r.department.trim()}__${r.program.trim()}__${shiftVal}__${sessVal}__${semVal}`,
        r
      );
    });
    return map;
  }, [allRecords]);

  // Aggregate by Degree Program (1 row per program - NO DUPLICATE ROWS for Morning/Evening)
  const allUniversityPrograms = useMemo<UnifiedProgramRow[]>(() => {
    const list: UnifiedProgramRow[] = [];

    UNIVERSITY_DEPARTMENTS.forEach((dept) => {
      const activeProgNames = StorageService.getSessionPrograms(dept.name, currentSession);

      dept.programs.forEach((prog) => {
        const isSessionActive = activeProgNames.includes(prog.name);

        const buildShiftData = (shiftName: AcademicShift): ShiftCohortData => {
          const semRecords: Record<string, SubmissionRecord | null> = {};
          let submittedCount = 0;
          let sumSubjects = 0;
          let sumUploaded = 0;
          let sumPending = 0;
          let firstSubSem: string | undefined = undefined;

          ACADEMIC_SEMESTERS.forEach((sem) => {
            const sub =
              recordMap.get(
                `${dept.name.trim()}__${prog.name.trim()}__${shiftName}__${currentSession}__${sem.id}`
              ) || null;
            semRecords[sem.id] = sub;
            if (sub) {
              submittedCount++;
              if (!firstSubSem) firstSubSem = sem.id;
              const sum = StorageService.calculateSummary(sub.subjects);
              sumSubjects += sum.totalSubjects;
              sumUploaded += sum.uploaded;
              sumPending += sum.pending;
            }
          });

          return {
            hasSubmission: submittedCount > 0,
            submittedSemestersCount: submittedCount,
            semesterRecords: semRecords,
            totalSubjects: sumSubjects,
            totalUploaded: sumUploaded,
            totalPending: sumPending,
            firstSubmittedSemester: firstSubSem,
          };
        };

        const morningData = buildShiftData('Morning');
        const eveningData = buildShiftData('Evening');

        const hasMorning = morningData.hasSubmission;
        const hasEvening = eveningData.hasSubmission;
        const hasAny = hasMorning || hasEvening;

        // If department coordinator entered Evening, automatically prioritize Evening!
        let recommendedShift: AcademicShift = 'Morning';
        if (hasEvening && !hasMorning) {
          recommendedShift = 'Evening';
        }

        list.push({
          department: dept.name,
          deptCode: dept.code,
          program: prog.name,
          degreeLevel: prog.degreeLevel,
          sessionActive: isSessionActive,
          shifts: {
            Morning: morningData,
            Evening: eveningData,
          },
          hasMorningSubmission: hasMorning,
          hasEveningSubmission: hasEvening,
          hasAnySubmission: hasAny,
          recommendedShift,
        });
      });
    });

    return list;
  }, [recordMap, currentSession, rosterVersion]);

  // High-level statistics based on active Session, Shift, and Semester filters
  const stats = useMemo(() => {
    const totalDepartments = UNIVERSITY_DEPARTMENTS.length;

    // Tracked cohorts based on shift filter
    const trackedPrograms = allUniversityPrograms.filter((p) => {
      if (onlySessionFilter && !p.sessionActive) return false;
      return true;
    });

    let totalCohortSlots = 0;
    let submittedSlots = 0;
    let totalSubjectsAcrossUni = 0;
    let totalUploadedAcrossUni = 0;
    let totalPendingAcrossUni = 0;

    trackedPrograms.forEach((p) => {
      const shiftsToInspect: AcademicShift[] =
        selectedShiftFilter === 'ALL'
          ? ['Morning', 'Evening']
          : [selectedShiftFilter];

      shiftsToInspect.forEach((sh) => {
        totalCohortSlots++;
        const sData = p.shifts[sh];

        if (selectedSemesterFilter !== 'ALL') {
          const semSub = sData.semesterRecords[selectedSemesterFilter];
          if (semSub) {
            submittedSlots++;
            const sum = StorageService.calculateSummary(semSub.subjects);
            totalSubjectsAcrossUni += sum.totalSubjects;
            totalUploadedAcrossUni += sum.uploaded;
            totalPendingAcrossUni += sum.pending;
          }
        } else {
          if (sData.hasSubmission) {
            submittedSlots++;
          }
          totalSubjectsAcrossUni += sData.totalSubjects;
          totalUploadedAcrossUni += sData.totalUploaded;
          totalPendingAcrossUni += sData.totalPending;
        }
      });
    });

    const pendingSlots = Math.max(0, totalCohortSlots - submittedSlots);
    const uniUploadPercentage =
      totalSubjectsAcrossUni > 0
        ? Math.round((totalUploadedAcrossUni / totalSubjectsAcrossUni) * 100)
        : 0;

    const totalGenuineSubmissionsCount = allUniversityPrograms.filter((p) => {
      if (selectedSemesterFilter !== 'ALL') {
        return (
          p.shifts.Morning.semesterRecords[selectedSemesterFilter] !== null ||
          p.shifts.Evening.semesterRecords[selectedSemesterFilter] !== null
        );
      }
      return p.hasAnySubmission;
    }).length;

    return {
      totalDepartments,
      totalPrograms: trackedPrograms.length,
      totalCohortSlots,
      submittedSlots,
      pendingSlots,
      totalSubjectsAcrossUni,
      totalUploadedAcrossUni,
      totalPendingAcrossUni,
      uniUploadPercentage,
      totalGenuineSubmissionsCount,
    };
  }, [allUniversityPrograms, onlySessionFilter, selectedShiftFilter, selectedSemesterFilter]);

  // Department-level metrics for Vice Chancellor executive monitoring
  const departmentStats = useMemo(() => {
    return UNIVERSITY_DEPARTMENTS.map((dept) => {
      const deptPrograms = allUniversityPrograms.filter((p) => p.department === dept.name);
      let totalSubjects = 0;
      let totalUploaded = 0;
      let totalPending = 0;
      let submittedCohorts = 0;
      let totalCohorts = 0;

      deptPrograms.forEach((prog) => {
        const shifts = [prog.shifts.Morning, prog.shifts.Evening];
        shifts.forEach((shift) => {
          totalCohorts += 1;
          if (selectedSemesterFilter === 'ALL') {
            totalSubjects += shift.totalSubjects;
            totalUploaded += shift.totalUploaded;
            totalPending += shift.totalPending;
            if (shift.hasSubmission) submittedCohorts += 1;
          } else {
            const rec = shift.semesterRecords[selectedSemesterFilter];
            if (rec) {
              submittedCohorts += 1;
              const s = StorageService.calculateSummary(rec.subjects);
              totalSubjects += s.totalSubjects;
              totalUploaded += s.uploaded;
              totalPending += s.pending;
            }
          }
        });
      });

      const percentage = totalSubjects > 0 ? Math.round((totalUploaded / totalSubjects) * 100) : 0;

      return {
        deptName: dept.name,
        deptCode: dept.code,
        programsCount: deptPrograms.length,
        totalSubjects,
        totalUploaded,
        totalPending,
        submittedCohorts,
        totalCohorts,
        percentage,
      };
    });
  }, [allUniversityPrograms, selectedSemesterFilter]);

  // Filtered program list (Single Row Per Program)
  const filteredPrograms = useMemo(() => {
    return allUniversityPrograms.filter((item) => {
      if (onlySessionFilter && !item.sessionActive) return false;

      // Department filter
      if (selectedDeptFilter !== 'ALL' && item.department !== selectedDeptFilter) {
        return false;
      }

      // Determine active shift to check
      const effectiveShift =
        selectedShiftFilter !== 'ALL'
          ? selectedShiftFilter
          : rowShiftOverrides[item.program] || item.recommendedShift;

      const activeShiftData = item.shifts[effectiveShift];

      // Check if submitted for the current semester filter
      const isSemesterSubmitted =
        selectedSemesterFilter !== 'ALL'
          ? activeShiftData.semesterRecords[selectedSemesterFilter] !== null
          : activeShiftData.hasSubmission;

      const programHasAnySubmissionInSemester =
        selectedSemesterFilter !== 'ALL'
          ? item.shifts.Morning.semesterRecords[selectedSemesterFilter] !== null ||
            item.shifts.Evening.semesterRecords[selectedSemesterFilter] !== null
          : item.hasAnySubmission;

      // Genuine Submissions Only toggle
      if (onlyGenuineSubmissions && !programHasAnySubmissionInSemester) {
        return false;
      }

      // Status filter
      if (statusFilter === 'SUBMITTED' && !isSemesterSubmitted) {
        return false;
      }
      if (statusFilter === 'PENDING' && isSemesterSubmitted) {
        return false;
      }

      // Search Query across Program, Department, Level, Shift, Course Code, Subject Title, Coordinator
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        let match =
          item.program.toLowerCase().includes(query) ||
          item.department.toLowerCase().includes(query) ||
          item.deptCode.toLowerCase().includes(query) ||
          item.degreeLevel.toLowerCase().includes(query) ||
          effectiveShift.toLowerCase().includes(query);

        // Deep search across courses and coordinators
        if (!match) {
          const checkRecords = [
            ...Object.values(item.shifts.Morning.semesterRecords),
            ...Object.values(item.shifts.Evening.semesterRecords),
          ].filter(Boolean) as SubmissionRecord[];

          for (const rec of checkRecords) {
            if (
              rec.hodCoordinator?.toLowerCase().includes(query) ||
              rec.accessedBy?.toLowerCase().includes(query) ||
              rec.userDesignation?.toLowerCase().includes(query)
            ) {
              match = true;
              break;
            }
            if (rec.subjects && Array.isArray(rec.subjects)) {
              for (const sub of rec.subjects) {
                if (
                  sub.courseCode?.toLowerCase().includes(query) ||
                  sub.subjectTitle?.toLowerCase().includes(query) ||
                  sub.status?.toLowerCase().includes(query) ||
                  sub.remarks?.toLowerCase().includes(query) ||
                  sub.uploadedBy?.toLowerCase().includes(query)
                ) {
                  match = true;
                  break;
                }
              }
            }
            if (match) break;
          }
        }

        if (!match) return false;
      }

      return true;
    });
  }, [
    allUniversityPrograms,
    onlySessionFilter,
    selectedDeptFilter,
    selectedShiftFilter,
    selectedSemesterFilter,
    rowShiftOverrides,
    onlyGenuineSubmissions,
    statusFilter,
    searchQuery,
  ]);

  return (
    <div id="vc-admin-dashboard" className="space-y-6">
      {/* VC Dashboard Header Banner with University Emblem */}
      <div className="bg-slate-900 text-white p-5 rounded-lg border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-1 rounded-full bg-slate-800 border border-slate-700 shrink-0">
            <MnsUetLogo className="w-12 h-12" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">
                Executive Monitoring
              </span>
              <button
                type="button"
                onClick={() => setIsSessionModalOpen(true)}
                className="text-emerald-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-0.5 rounded text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
              >
                <Calendar className="w-3 h-3 text-emerald-400" />
                Session {currentSession}
              </button>
              <span className="text-emerald-400 font-bold text-xs bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                {selectedSemesterFilter === 'ALL'
                  ? 'All 8 Semesters Overview'
                  : `Semester ${selectedSemesterFilter} Active`}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-100">
              Vice Chancellor &amp; Deans Executive Monitoring Dashboard
            </h2>
            <p className="text-xs text-slate-300">
              Muhammad Nawaz Sharif University of Engineering &amp; Technology, Multan • LMS Result Uploads
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-open-executive-report"
            type="button"
            onClick={() => setIsExecutiveReportOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg border border-slate-700 shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            title="Generate print-ready executive compliance report or departmental reminder circular"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Official Report &amp; Notice</span>
          </button>

          <button
            id="btn-export-university-master-csv"
            type="button"
            onClick={() => StorageService.exportCSV()}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download Master University Report (CSV)
          </button>
        </div>
      </div>

      {/* University Metric Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Genuine Upload Progress */}
        <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {selectedSemesterFilter === 'ALL' ? 'Total Submissions' : `Semester ${selectedSemesterFilter} Submissions`}
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-900">
              {stats.submittedSlots} / {stats.totalCohortSlots}
            </span>
            <span className="text-xs font-bold text-emerald-700">
              {stats.totalCohortSlots > 0
                ? `${Math.round((stats.submittedSlots / stats.totalCohortSlots) * 100)}%`
                : '0%'}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all"
              style={{
                width: `${
                  stats.totalCohortSlots > 0
                    ? (stats.submittedSlots / stats.totalCohortSlots) * 100
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {stats.pendingSlots} cohort slot(s) awaiting HOD entry
          </p>
        </div>

        {/* Total Subjects Logged */}
        <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Active Subjects Logged
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-900">
              {stats.totalSubjectsAcrossUni}
            </span>
            <span className="text-xs text-slate-500">courses</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            Across {stats.submittedSlots} submitted course sheet(s)
          </p>
        </div>

        {/* Uploaded Subjects */}
        <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            LMS Uploaded &amp; Verified
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-emerald-700">
              {stats.totalUploadedAcrossUni}
            </span>
            <span className="text-xs font-bold text-emerald-600">
              {stats.totalSubjectsAcrossUni > 0
                ? `${Math.round(
                    (stats.totalUploadedAcrossUni / stats.totalSubjectsAcrossUni) * 100
                  )}%`
                : '0%'}
            </span>
          </div>
          <p className="text-[11px] text-emerald-700 mt-3">
            Finalized marks and result sheets in LMS
          </p>
        </div>

        {/* Pending Results */}
        <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
            Results Incomplete / Pending
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-amber-700">
              {stats.totalPendingAcrossUni}
            </span>
            <span className="text-xs text-amber-600">courses awaiting upload</span>
          </div>
          <p className="text-[11px] text-amber-700 mt-3">
            Action required by respective course instructors
          </p>
        </div>
      </div>

      {/* Primary Semester Selection Tabs Strip (Requirement: When user selects Semester 1, show Semester 1 genuinely) */}
      <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Select Semester to Monitor:
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              (Selecting a semester focuses the roster strictly on that semester's genuine LMS status)
            </span>
          </div>
          {selectedSemesterFilter !== 'ALL' && (
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-300">
              Currently Monitoring: Semester {selectedSemesterFilter} ({ACADEMIC_SEMESTERS.find((s) => s.id === selectedSemesterFilter)?.label})
            </span>
          )}
        </div>

        {/* Semester Buttons Bar (1 to 8 + All Matrix) */}
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5">
          {ACADEMIC_SEMESTERS.map((sem) => {
            const isSelected = selectedSemesterFilter === sem.id;
            return (
              <button
                key={sem.id}
                id={`btn-vc-filter-sem-${sem.id}`}
                type="button"
                onClick={() => setSelectedSemesterFilter(sem.id)}
                className={`py-2 px-2 rounded-md font-bold text-xs flex flex-col items-center justify-center transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs ring-2 ring-emerald-500/40'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <span className="text-xs">{sem.shortLabel}</span>
                <span className={`text-[10px] ${isSelected ? 'text-emerald-200' : 'text-slate-500'}`}>
                  {sem.label}
                </span>
              </button>
            );
          })}

          {/* All 8 Semesters Matrix Option */}
          <button
            id="btn-vc-filter-sem-all"
            type="button"
            onClick={() => setSelectedSemesterFilter('ALL')}
            className={`py-2 px-2 rounded-md font-bold text-xs flex flex-col items-center justify-center transition-all cursor-pointer border ${
              selectedSemesterFilter === 'ALL'
                ? 'bg-slate-900 text-white border-slate-950 shadow-xs ring-2 ring-slate-500/40'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="text-xs">All Semesters</span>
            <span className={`text-[10px] ${selectedSemesterFilter === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
              Matrix (1 to 8)
            </span>
          </button>
        </div>
      </div>

      {/* Vice Chancellor Executive Productivity Suite: Department Performance & Compliance Matrix */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-2xs overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-700" />
            <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight uppercase">
              Department Compliance &amp; Accountability Matrix
            </h3>
            <span className="text-[10px] bg-indigo-100 text-indigo-900 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
              Executive Oversight
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Click any department card to filter results instantly
          </span>
        </div>

        <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {departmentStats.map((dept) => {
            const isSelected = selectedDeptFilter === dept.deptName;
            const hasData = dept.totalSubjects > 0;
            const isFull = hasData && dept.percentage === 100;
            const isPartial = hasData && dept.percentage > 0 && dept.percentage < 100;

            return (
              <div
                key={dept.deptCode}
                onClick={() =>
                  setSelectedDeptFilter(isSelected ? 'ALL' : dept.deptName)
                }
                className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between group ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/30 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-black text-slate-900 group-hover:text-emerald-800 transition-colors">
                      {dept.deptCode}
                    </span>
                    {isFull ? (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded flex items-center gap-1 border border-emerald-300">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                        100% Complete
                      </span>
                    ) : isPartial ? (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded flex items-center gap-1 border border-amber-300">
                        <Clock className="w-2.5 h-2.5 text-amber-700" />
                        {dept.totalPending} Pending
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                        {dept.programsCount} Programs
                      </span>
                    )}
                  </div>
                  <h4 className="text-[11px] font-semibold text-slate-700 line-clamp-1" title={dept.deptName}>
                    {dept.deptName}
                  </h4>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/80">
                  <div className="flex items-baseline justify-between text-[11px] mb-1">
                    <span className="text-slate-500">
                      {dept.totalUploaded}/{dept.totalSubjects} Uploaded
                    </span>
                    <span
                      className={`font-black ${
                        isFull
                          ? 'text-emerald-700'
                          : dept.percentage > 50
                          ? 'text-indigo-700'
                          : 'text-slate-700'
                      }`}
                    >
                      {dept.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isFull
                          ? 'bg-emerald-600'
                          : dept.percentage > 50
                          ? 'bg-indigo-600'
                          : dept.percentage > 0
                          ? 'bg-amber-500'
                          : 'bg-slate-300'
                      }`}
                      style={{ width: `${dept.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Urgent Vice Chancellor Executive Action Directive (If Pending Courses Exist) */}
      {stats.totalPendingAcrossUni > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-amber-100 text-amber-700 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-900 flex items-center gap-1.5">
                Executive Action Directive: {stats.totalPendingAcrossUni} Course Result(s) Pending Upload
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                {stats.totalUploadedAcrossUni} of {stats.totalSubjectsAcrossUni} courses verified ({stats.uniUploadPercentage}% completion). Course instructors must finalize mark sheets before academic deadlines.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING')}
              className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-md shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter Pending Only</span>
            </button>
            <button
              type="button"
              onClick={() => setIsExecutiveReportOpen(true)}
              className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-amber-100 text-amber-900 border border-amber-400 rounded-md shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-amber-800" />
              <span>Issue VC Circular</span>
            </button>
          </div>
        </div>
      )}

      {/* Advanced Filters and Genuine Submissions Toggle */}
      <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              id="filter-department"
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Departments ({UNIVERSITY_DEPARTMENTS.length})</option>
              {UNIVERSITY_DEPARTMENTS.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Shift Filter (Morning / Evening) */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span className="text-slate-400 font-semibold">Global Shift:</span>
            <select
              id="filter-shift"
              value={selectedShiftFilter}
              onChange={(e) => setSelectedShiftFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Shifts (Unified Program Rows)</option>
              <option value="Morning">Morning Shift Only</option>
              <option value="Evening">Evening Shift Only</option>
            </select>
          </div>

          {/* Submission Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted in LMS ({stats.submittedSlots})</option>
              <option value="PENDING">Pending Submission ({stats.pendingSlots})</option>
            </select>
          </div>

          {/* Genuine Submissions Only Quick Toggle */}
          <button
            type="button"
            onClick={() => setOnlyGenuineSubmissions((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all border cursor-pointer ${
              onlyGenuineSubmissions
                ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
            }`}
            title="Click to view only departments and programs that have genuinely submitted LMS result data"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Genuine Submissions Only ({stats.totalGenuineSubmissionsCount})</span>
          </button>

          {/* Session Active Toggle */}
          <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-slate-700 font-semibold bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={onlySessionFilter}
              onChange={(e) => setOnlySessionFilter(e.target.checked)}
              className="rounded text-emerald-700 focus:ring-emerald-600 w-3.5 h-3.5"
            />
            <span>Session {currentSession} Enrolled Only</span>
          </label>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-vc"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search program, dept, course code, HOD..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Program Status Master Table */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        {/* Table Top Header */}
        <div className="bg-slate-800 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-sm">
              Academic Program LMS Result Roster ({filteredPrograms.length} Programs)
            </h3>
            {selectedSemesterFilter !== 'ALL' && (
              <span className="text-[11px] bg-emerald-700 text-emerald-100 font-bold px-2 py-0.5 rounded">
                Semester {selectedSemesterFilter} View
              </span>
            )}
          </div>
          <span className="text-xs text-slate-300">
            {selectedSemesterFilter === 'ALL'
              ? 'Click any semester number [1]–[8] to inspect full results'
              : `Showing genuine results for Semester ${selectedSemesterFilter}. Click "Inspect Sheet" to view course rows.`}
          </span>
        </div>

        {/* Mobile Responsive Program Cards (Visible on screens < 768px) */}
        <div className="block md:hidden divide-y divide-slate-200 bg-white">
          {filteredPrograms.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs px-4">
              {onlyGenuineSubmissions
                ? 'No departments have submitted LMS result data for this selection yet.'
                : 'No programs found matching the selected filters.'}
            </div>
          ) : (
            filteredPrograms.map((progItem) => {
              const effectiveShift: AcademicShift =
                selectedShiftFilter !== 'ALL'
                  ? selectedShiftFilter
                  : rowShiftOverrides[progItem.program] || progItem.recommendedShift;

              const shiftData = progItem.shifts[effectiveShift];
              const isSpecificSem = selectedSemesterFilter !== 'ALL';

              const activeSub = isSpecificSem
                ? shiftData.semesterRecords[selectedSemesterFilter]
                : shiftData.firstSubmittedSemester
                ? shiftData.semesterRecords[shiftData.firstSubmittedSemester]
                : null;

              const activeSummary = activeSub
                ? StorageService.calculateSummary(activeSub.subjects)
                : null;

              const displaySubjectsCount = isSpecificSem
                ? activeSummary?.totalSubjects || 0
                : shiftData.totalSubjects;

              const displayUploadedCount = isSpecificSem
                ? activeSummary?.uploaded || 0
                : shiftData.totalUploaded;

              const displayUploadPercentage =
                displaySubjectsCount > 0
                  ? Math.round((displayUploadedCount / displaySubjectsCount) * 100)
                  : 0;

              return (
                <div key={`mob-${progItem.department}-${progItem.program}`} className="p-3.5 space-y-2.5">
                  {/* Top Dept & Level Row */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      {progItem.department}
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                      {progItem.degreeLevel}
                    </span>
                  </div>

                  {/* Program Title & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 leading-snug">
                        {progItem.program}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        {progItem.sessionActive && (
                          <span className="text-[9px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-bold border border-emerald-200">
                            Session {currentSession}
                          </span>
                        )}
                        {progItem.hasAnySubmission && (
                          <span className="text-[9px] text-emerald-900 bg-emerald-100 px-1.5 py-0.5 rounded font-bold border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                            LMS Active
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Shift Toggle Buttons */}
                    <div className="inline-flex p-0.5 bg-slate-100 rounded-md border border-slate-300 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setRowShiftOverrides((prev) => ({
                            ...prev,
                            [progItem.program]: 'Morning',
                          }))
                        }
                        className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 ${
                          effectiveShift === 'Morning'
                            ? 'bg-amber-500 text-white shadow-2xs'
                            : 'text-slate-600'
                        }`}
                      >
                        <Sun className="w-2.5 h-2.5" />
                        <span>Morn</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRowShiftOverrides((prev) => ({
                            ...prev,
                            [progItem.program]: 'Evening',
                          }))
                        }
                        className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 ${
                          effectiveShift === 'Evening'
                            ? 'bg-indigo-700 text-white shadow-2xs'
                            : 'text-slate-600'
                        }`}
                      >
                        <Moon className="w-2.5 h-2.5" />
                        <span>Eve</span>
                      </button>
                    </div>
                  </div>

                  {/* Progress & Upload Summary */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="flex items-baseline justify-between text-xs mb-1.5">
                      <span className="text-slate-600 font-medium text-[11px]">
                        {displaySubjectsCount > 0
                          ? `${displayUploadedCount} of ${displaySubjectsCount} Courses Verified`
                          : 'No Course Sheet Submitted'}
                      </span>
                      <span
                        className={`font-black text-xs ${
                          displayUploadPercentage === 100
                            ? 'text-emerald-700'
                            : displayUploadPercentage > 50
                            ? 'text-indigo-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {displayUploadPercentage}% Uploaded
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          displayUploadPercentage === 100
                            ? 'bg-emerald-600'
                            : displayUploadPercentage > 50
                            ? 'bg-indigo-600'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${displayUploadPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    type="button"
                    onClick={() =>
                      onSelectProgramToEdit(
                        progItem.department,
                        progItem.program,
                        effectiveShift,
                        currentSession,
                        selectedSemesterFilter !== 'ALL'
                          ? selectedSemesterFilter
                          : shiftData.firstSubmittedSemester || '1'
                      )
                    }
                    className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>
                      {selectedSemesterFilter !== 'ALL'
                        ? `Inspect Semester ${selectedSemesterFilter} Courses`
                        : 'Inspect Program Result Sheet'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 ml-auto text-emerald-700" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View (Visible on screens >= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table id="vc-roster-table" className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold tracking-wider border-b border-slate-300 text-[11px] uppercase">
                <th className="py-2.5 px-3 border-r border-slate-300">Department / School</th>
                <th className="py-2.5 px-3 border-r border-slate-300 min-w-[200px]">Degree Program</th>
                <th className="py-2.5 px-2 border-r border-slate-300 text-center w-16">Level</th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-center min-w-[170px]">
                  Academic Shift
                </th>
                {selectedSemesterFilter !== 'ALL' ? (
                  <th className="py-2.5 px-3 border-r border-slate-300 text-center min-w-[180px]">
                    Semester {selectedSemesterFilter} LMS Status
                  </th>
                ) : (
                  <th className="py-2.5 px-3 border-r border-slate-300 text-center min-w-[200px]">
                    Semesters (1 to 8)
                  </th>
                )}
                <th className="py-2.5 px-3 border-r border-slate-300 text-center w-28">Subjects</th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-center w-32">
                  LMS Upload %
                </th>
                <th className="py-2.5 px-3 text-center w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredPrograms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 text-sm">
                    {onlyGenuineSubmissions
                      ? 'No departments have submitted LMS result data for this selection yet.'
                      : 'No programs found matching the selected filters.'}
                  </td>
                </tr>
              ) : (
                filteredPrograms.map((progItem) => {
                  // Determine active shift for this row
                  const effectiveShift: AcademicShift =
                    selectedShiftFilter !== 'ALL'
                      ? selectedShiftFilter
                      : rowShiftOverrides[progItem.program] || progItem.recommendedShift;

                  const shiftData = progItem.shifts[effectiveShift];
                  const isSpecificSem = selectedSemesterFilter !== 'ALL';

                  // Specific semester record for the chosen shift
                  const activeSub = isSpecificSem
                    ? shiftData.semesterRecords[selectedSemesterFilter]
                    : shiftData.firstSubmittedSemester
                    ? shiftData.semesterRecords[shiftData.firstSubmittedSemester]
                    : null;

                  const activeSummary = activeSub
                    ? StorageService.calculateSummary(activeSub.subjects)
                    : null;

                  const isSubmitted = isSpecificSem
                    ? activeSub !== null
                    : shiftData.hasSubmission;

                  const displaySubjectsCount = isSpecificSem
                    ? activeSummary?.totalSubjects || 0
                    : shiftData.totalSubjects;

                  const displayUploadedCount = isSpecificSem
                    ? activeSummary?.uploaded || 0
                    : shiftData.totalUploaded;

                  const displayUploadPercentage =
                    displaySubjectsCount > 0
                      ? Math.round((displayUploadedCount / displaySubjectsCount) * 100)
                      : 0;

                  return (
                    <tr
                      key={`${progItem.department}-${progItem.program}`}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      {/* Department */}
                      <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                        {progItem.department}
                      </td>

                      {/* Degree Program (Single Row - No duplicates) */}
                      <td className="py-2.5 px-3 font-semibold text-slate-900 border-r border-slate-200">
                        <div className="font-bold">{progItem.program}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {progItem.sessionActive ? (
                            <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-200">
                              Session {currentSession} Active
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              Other Cycle
                            </span>
                          )}
                          {/* Indicator if this program has genuine submissions */}
                          {progItem.hasAnySubmission && (
                            <span className="text-[10px] text-emerald-900 bg-emerald-100 px-1.5 py-0.5 rounded font-bold border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                              LMS Active
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Degree Level */}
                      <td className="py-2.5 px-2 text-center text-slate-600 font-mono text-[11px] border-r border-slate-200">
                        {progItem.degreeLevel}
                      </td>

                      {/* Academic Shift (Interactive Selector & Status in One Row) */}
                      <td className="py-2.5 px-3 border-r border-slate-200">
                        <div className="flex flex-col items-center gap-1">
                          <div className="inline-flex p-0.5 bg-slate-100 rounded-md border border-slate-300">
                            {/* Morning Shift Pill */}
                            <button
                              type="button"
                              onClick={() =>
                                setRowShiftOverrides((prev) => ({
                                  ...prev,
                                  [progItem.program]: 'Morning',
                                }))
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                effectiveShift === 'Morning'
                                  ? 'bg-amber-500 text-white shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                              title={
                                progItem.hasMorningSubmission
                                  ? 'Morning Shift has submitted LMS results'
                                  : 'Morning Shift - Click to view'
                              }
                            >
                              <Sun className="w-2.5 h-2.5" />
                              <span>Morning</span>
                              {progItem.hasMorningSubmission && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ring-1 ring-white"></span>
                              )}
                            </button>

                            {/* Evening Shift Pill */}
                            <button
                              type="button"
                              onClick={() =>
                                setRowShiftOverrides((prev) => ({
                                  ...prev,
                                  [progItem.program]: 'Evening',
                                }))
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                effectiveShift === 'Evening'
                                  ? 'bg-indigo-700 text-white shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                              title={
                                progItem.hasEveningSubmission
                                  ? 'Evening Shift has submitted LMS results'
                                  : 'Evening Shift - Click to view'
                              }
                            >
                              <Moon className="w-2.5 h-2.5" />
                              <span>Evening</span>
                              {progItem.hasEveningSubmission && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ring-1 ring-white"></span>
                              )}
                            </button>
                          </div>

                          {/* Quick Shift Status Tag */}
                          <div className="text-[10px] text-slate-500 font-medium">
                            {progItem.hasEveningSubmission && !progItem.hasMorningSubmission ? (
                              <span className="text-indigo-800 font-semibold">
                                Evening Record Active
                              </span>
                            ) : progItem.hasMorningSubmission && !progItem.hasEveningSubmission ? (
                              <span className="text-amber-800 font-semibold">
                                Morning Record Active
                              </span>
                            ) : progItem.hasMorningSubmission && progItem.hasEveningSubmission ? (
                              <span className="text-emerald-800 font-bold">
                                Both Shifts Active
                              </span>
                            ) : (
                              <span className="text-slate-400">Viewing: {effectiveShift}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Semester Column: Shows ONLY Selected Semester OR Matrix (Requirement: genuine view) */}
                      <td className="py-2 px-3 border-r border-slate-200">
                        {selectedSemesterFilter !== 'ALL' ? (
                          /* Dedicated Clean View for the Selected Semester */
                          <div className="flex flex-col items-center justify-center text-center">
                            {isSubmitted ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Semester {selectedSemesterFilter} Submitted
                                </span>
                                {activeSub && (
                                  <div className="text-[10px] text-slate-600 truncate max-w-[160px]">
                                    By: <strong>{activeSub.accessedBy || activeSub.hodCoordinator}</strong>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-500" />
                                  Awaiting Entry
                                </span>
                                <div className="text-[10px] text-slate-400">
                                  Semester {selectedSemesterFilter} not yet uploaded
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Full 8-Semester Matrix only when user explicitly selected "All Semesters" */
                          <div>
                            <div className="flex items-center justify-center gap-1">
                              {ACADEMIC_SEMESTERS.map((sem) => {
                                const semSub = shiftData.semesterRecords[sem.id];
                                const isSub = Boolean(semSub);
                                const semSum = semSub
                                  ? StorageService.calculateSummary(semSub.subjects)
                                  : null;

                                return (
                                  <button
                                    key={sem.id}
                                    type="button"
                                    title={
                                      isSub
                                        ? `Semester ${sem.id}: Submitted (${semSum?.uploaded || 0}/${semSum?.totalSubjects || 0} subjects) - Click to inspect`
                                        : `Semester ${sem.id}: Awaiting entry - Click to create`
                                    }
                                    onClick={() =>
                                      onSelectProgramToEdit(
                                        progItem.department,
                                        progItem.program,
                                        effectiveShift,
                                        currentSession,
                                        sem.id
                                      )
                                    }
                                    className={`w-6 h-6 rounded text-[10px] font-black transition-all cursor-pointer flex items-center justify-center border ${
                                      isSub
                                        ? 'bg-emerald-700 text-white border-emerald-800 hover:bg-emerald-800 shadow-2xs'
                                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-800'
                                    }`}
                                  >
                                    {sem.id}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="text-[10px] text-center mt-1 font-medium">
                              <span
                                className={
                                  shiftData.submittedSemestersCount > 0
                                    ? 'text-emerald-700 font-bold'
                                    : 'text-slate-400'
                                }
                              >
                                {shiftData.submittedSemestersCount} of 8 Semesters Submitted
                              </span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Subjects Count */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-200">
                        {displaySubjectsCount > 0 ? (
                          <span className="font-bold text-slate-800">
                            {displayUploadedCount} / {displaySubjectsCount}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* Upload % */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-200">
                        {displaySubjectsCount > 0 ? (
                          <div className="flex flex-col items-center">
                            <span
                              className={`text-xs font-bold ${
                                displayUploadPercentage === 100
                                  ? 'text-emerald-700'
                                  : displayUploadPercentage > 50
                                  ? 'text-blue-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {displayUploadPercentage}%
                            </span>
                            <div className="w-16 bg-slate-200 rounded-full h-1 mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  displayUploadPercentage === 100
                                    ? 'bg-emerald-600'
                                    : 'bg-blue-600'
                                }`}
                                style={{ width: `${displayUploadPercentage}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">0%</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            onSelectProgramToEdit(
                              progItem.department,
                              progItem.program,
                              effectiveShift,
                              currentSession,
                              selectedSemesterFilter !== 'ALL'
                                ? selectedSemesterFilter
                                : shiftData.firstSubmittedSemester || '1'
                            )
                          }
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 rounded border border-emerald-300 transition-colors inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>
                            {selectedSemesterFilter !== 'ALL'
                              ? `Inspect Sem ${selectedSemesterFilter}`
                              : 'Inspect Sheet'}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Academic Session Selector Modal */}
      <AcademicSessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        currentSession={currentSession}
        onSessionSelect={(newSess) => {
          setCurrentSession(newSess);
        }}
      />

      {/* Session Program Roster Selector Modal */}
      <Session2023SelectorModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        departmentName={rosterDept}
        sessionName={currentSession}
        onRosterUpdated={() => {
          setRosterVersion((v) => v + 1);
        }}
      />

      {/* Executive Report & Formal Compliance Notice Generator */}
      <ExecutiveReportModal
        isOpen={isExecutiveReportOpen}
        onClose={() => setIsExecutiveReportOpen(false)}
        allPrograms={allUniversityPrograms}
        allRecords={allRecords}
        currentSession={currentSession}
        selectedSemester={selectedSemesterFilter}
        stats={{
          totalDegreePrograms: stats.totalPrograms,
          submittedProgramsCount: stats.submittedSlots,
          totalActiveSubjects: stats.totalSubjectsAcrossUni,
          totalUploadedSubjects: stats.totalUploadedAcrossUni,
          totalPendingSubjects: stats.totalPendingAcrossUni,
          uploadPercentage: stats.uniUploadPercentage,
        }}
      />
    </div>
  );
};
