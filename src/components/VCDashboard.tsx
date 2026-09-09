import React, { useState, useMemo } from 'react';
import { UNIVERSITY_DEPARTMENTS, ACADEMIC_SHIFTS } from '../data/departmentsData';
import { StorageService } from '../services/storageService';
import { SubmissionRecord, AcademicShift } from '../types';
import { Session2023SelectorModal } from './Session2023SelectorModal';
import { AcademicSessionModal } from './AcademicSessionModal';
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
} from 'lucide-react';

interface Props {
  onSelectProgramToEdit: (department: string, program: string, shift?: AcademicShift, session?: string) => void;
  allRecords: SubmissionRecord[];
}

export const VCDashboard: React.FC<Props> = ({ onSelectProgramToEdit, allRecords }) => {
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<'ALL' | AcademicShift>('ALL');
  const [currentSession, setCurrentSession] = useState<string>(() => StorageService.getSelectedSession());
  const [isSessionModalOpen, setIsSessionModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'PENDING'>('ALL');
  const [onlySessionFilter, setOnlySessionFilter] = useState<boolean>(true);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false);
  const [rosterDept, setRosterDept] = useState<string>(UNIVERSITY_DEPARTMENTS[0].name);
  const [rosterVersion, setRosterVersion] = useState<number>(0);

  // Map of submissions by unique key: department__program__degreeLevel__shift__session
  const recordMap = useMemo(() => {
    const map = new Map<string, SubmissionRecord>();
    allRecords.forEach((r) => {
      const shiftVal = r.shift || 'Morning';
      const sessVal = r.session || '2023';
      map.set(`${r.department.trim()}__${r.program.trim()}__${shiftVal}__${sessVal}`, r);
    });
    return map;
  }, [allRecords]);

  // Aggregate university cohorts by Department -> Program -> Level -> Shift (Morning & Evening)
  const allUniversityCohorts = useMemo(() => {
    const list: {
      department: string;
      deptCode: string;
      program: string;
      degreeLevel: string;
      shift: AcademicShift;
      sessionActive: boolean;
      submission: SubmissionRecord | null;
    }[] = [];

    UNIVERSITY_DEPARTMENTS.forEach((dept) => {
      const activeProgNames = StorageService.getSessionPrograms(dept.name, currentSession);
      dept.programs.forEach((prog) => {
        const isSessionActive = activeProgNames.includes(prog.name);
        // Add both Morning and Evening shift cohorts
        ACADEMIC_SHIFTS.forEach(({ id: shift }) => {
          const sub = recordMap.get(`${dept.name.trim()}__${prog.name.trim()}__${shift}__${currentSession}`) || null;
          list.push({
            department: dept.name,
            deptCode: dept.code,
            program: prog.name,
            degreeLevel: prog.degreeLevel,
            shift,
            sessionActive: isSessionActive,
            submission: sub,
          });
        });
      });
    });

    return list;
  }, [recordMap, currentSession, rosterVersion]);

  // High-level statistics based on active Session and Shift filters
  const stats = useMemo(() => {
    const totalDepartments = UNIVERSITY_DEPARTMENTS.length;
    
    // Tracked cohorts set (Session active cohorts when filter is on, and matched shift)
    const trackedCohorts = allUniversityCohorts.filter((c) => {
      if (onlySessionFilter && !c.sessionActive) return false;
      if (selectedShiftFilter !== 'ALL' && c.shift !== selectedShiftFilter) return false;
      return true;
    });

    const totalCohorts = trackedCohorts.length;
    const submittedCohorts = trackedCohorts.filter((c) => c.submission !== null).length;
    const pendingCohorts = totalCohorts - submittedCohorts;

    let totalSubjectsAcrossUni = 0;
    let totalUploadedAcrossUni = 0;
    let totalPendingAcrossUni = 0;
    let totalInProgressAcrossUni = 0;

    trackedCohorts.forEach((c) => {
      if (c.submission) {
        const sum = StorageService.calculateSummary(c.submission.subjects);
        totalSubjectsAcrossUni += sum.totalSubjects;
        totalUploadedAcrossUni += sum.uploaded;
        totalPendingAcrossUni += sum.pending;
        totalInProgressAcrossUni += sum.inProgress;
      }
    });

    const uniUploadPercentage =
      totalSubjectsAcrossUni > 0
        ? Math.round((totalUploadedAcrossUni / totalSubjectsAcrossUni) * 100)
        : 0;

    const cohortSubmissionPercentage =
      totalCohorts > 0
        ? Math.round((submittedCohorts / totalCohorts) * 100)
        : 0;

    return {
      totalDepartments,
      totalCohorts,
      submittedCohorts,
      pendingCohorts,
      cohortSubmissionPercentage,
      totalSubjectsAcrossUni,
      totalUploadedAcrossUni,
      totalPendingAcrossUni,
      totalInProgressAcrossUni,
      uniUploadPercentage,
    };
  }, [allUniversityCohorts, onlySessionFilter, selectedShiftFilter]);

  // Filtered cohort list
  const filteredCohorts = useMemo(() => {
    return allUniversityCohorts.filter((item) => {
      if (onlySessionFilter && !item.sessionActive) return false;
      if (selectedShiftFilter !== 'ALL' && item.shift !== selectedShiftFilter) return false;
      const matchDept = selectedDeptFilter === 'ALL' || item.department === selectedDeptFilter;
      const matchStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'SUBMITTED'
          ? item.submission !== null
          : item.submission === null;
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        item.program.toLowerCase().includes(query) ||
        item.department.toLowerCase().includes(query) ||
        item.degreeLevel.toLowerCase().includes(query) ||
        item.shift.toLowerCase().includes(query);

      return matchDept && matchStatus && matchSearch;
    });
  }, [allUniversityCohorts, onlySessionFilter, selectedShiftFilter, selectedDeptFilter, statusFilter, searchQuery]);

  return (
    <div id="vc-admin-dashboard" className="space-y-6">
      {/* VC Dashboard Header Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-lg border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">
              Executive Monitoring
            </span>
            <button
              type="button"
              onClick={() => setIsSessionModalOpen(true)}
              className="text-emerald-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
            >
              <Calendar className="w-3 h-3 text-emerald-400" />
              Session {currentSession}
            </button>
            <span className="text-slate-400 text-xs">• Semester 1</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">
            Vice Chancellor & Deans Overview Dashboard
          </h2>
          <p className="text-xs text-slate-300">
            Real-time status of LMS result submissions across all faculties, schools, academic
            departments, and shifts (Morning & Evening).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-export-university-master-csv"
            type="button"
            onClick={() => StorageService.exportCSV()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download Master University Report (CSV)
          </button>
        </div>
      </div>

      {/* University Metric Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Submissions Progress */}
        <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Class Cohort Submissions
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-900">
              {stats.submittedCohorts} / {stats.totalCohorts}
            </span>
            <span className="text-xs font-bold text-emerald-700">
              {stats.totalCohorts > 0
                ? `${Math.round((stats.submittedCohorts / stats.totalCohorts) * 100)}%`
                : '0%'}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all"
              style={{
                width: `${
                  stats.totalCohorts > 0
                    ? (stats.submittedCohorts / stats.totalCohorts) * 100
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {stats.pendingCohorts} cohort(s) awaiting HOD entry
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
            Across {stats.submittedCohorts} submitted academic cohort(s)
          </p>
        </div>

        {/* Uploaded Subjects */}
        <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            LMS Uploaded
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
            Results finalized and verified in LMS
          </p>
        </div>

        {/* Pending Results */}
        <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
            Results Incomplete / Pending
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-amber-700">
              {stats.totalPendingAcrossUni + stats.totalInProgressAcrossUni}
            </span>
            <span className="text-xs text-amber-600">
              ({stats.totalPendingAcrossUni} pending, {stats.totalInProgressAcrossUni} in progress)
            </span>
          </div>
          <p className="text-[11px] text-amber-700 mt-3">
            Requires follow-up by Office of Examinations
          </p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-2xs flex flex-wrap items-center justify-between gap-3">
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
            <span className="text-slate-400 font-semibold">Shift:</span>
            <select
              id="filter-shift"
              value={selectedShiftFilter}
              onChange={(e) => setSelectedShiftFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Shifts (Morning & Evening)</option>
              <option value="Morning">Morning Only</option>
              <option value="Evening">Evening Only</option>
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
              <option value="SUBMITTED">Submitted in Database ({stats.submittedCohorts})</option>
              <option value="PENDING">Pending Submission ({stats.pendingCohorts})</option>
            </select>
          </div>

          {/* Session Active Cohort Toggle */}
          <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-slate-700 font-semibold bg-emerald-50/70 px-2.5 py-1.5 rounded-md border border-emerald-300 hover:bg-emerald-100 transition-colors">
            <input
              type="checkbox"
              checked={onlySessionFilter}
              onChange={(e) => setOnlySessionFilter(e.target.checked)}
              className="rounded text-emerald-700 focus:ring-emerald-600 w-3.5 h-3.5"
            />
            <span className="text-emerald-950">Session {currentSession} Active Cohorts Only</span>
          </label>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-vc"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search department, program, shift..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Session Genuine Tracking Notice */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2.5 text-emerald-950">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
          <div>
            <span className="font-bold">Session {currentSession} Hierarchy Active: </span>
            <span>
              Tracking: <strong>Department → Program → Level → Shift (Morning / Evening)</strong>. Each shift possesses
              an independent LMS result template and data area.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-switch-session-vc"
            type="button"
            onClick={() => setIsSessionModalOpen(true)}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-md border border-slate-300 shadow-2xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer text-xs"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <span>Switch Session ({currentSession})</span>
          </button>
          <button
            id="btn-vc-configure-roster"
            type="button"
            onClick={() => {
              setRosterDept(selectedDeptFilter !== 'ALL' ? selectedDeptFilter : UNIVERSITY_DEPARTMENTS[0].name);
              setIsRosterModalOpen(true);
            }}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-md shadow-2xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer text-xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Configure Active Programs</span>
          </button>
        </div>
      </div>

      {/* Program Status Table */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-sm">
              Academic Cohort LMS Result Upload Roster ({filteredCohorts.length})
            </h3>
          </div>
          <span className="text-xs text-slate-300">
            Click "Inspect Sheet" to view or edit full course rows in HOD view for that exact Shift
          </span>
        </div>

        <div className="overflow-x-auto">
          <table id="vc-roster-table" className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold tracking-wider border-b border-slate-300 text-[11px] uppercase">
                <th className="py-2.5 px-3 border-r border-slate-300">Department / School</th>
                <th className="py-2.5 px-3 border-r border-slate-300">Degree Program</th>
                <th className="py-2.5 px-2 border-r border-slate-300 text-center w-20">Level</th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-center w-28">Shift</th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-center w-36">
                  Submission Status
                </th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-center w-28">Subjects</th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-center w-32">
                  LMS Upload %
                </th>
                <th className="py-2.5 px-3 text-center w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredCohorts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-sm">
                    No programs or shifts found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredCohorts.map((item, index) => {
                  const sub = item.submission;
                  const summary = sub ? StorageService.calculateSummary(sub.subjects) : null;
                  const isMorning = item.shift === 'Morning';

                  return (
                    <tr
                      key={`${item.department}-${item.program}-${item.shift}-${index}`}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      {/* Department */}
                      <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                        {item.department}
                      </td>

                      {/* Program */}
                      <td className="py-2.5 px-3 font-semibold text-slate-900 border-r border-slate-200">
                        <div>{item.program}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {item.sessionActive ? (
                            <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-200">
                              Session {currentSession} Active
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              Other Cycle
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Degree Level */}
                      <td className="py-2.5 px-2 text-center text-slate-600 font-mono text-[11px] border-r border-slate-200">
                        {item.degreeLevel}
                      </td>

                      {/* Shift (Morning / Evening) */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-200">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isMorning
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : 'bg-indigo-50 text-indigo-900 border-indigo-300'
                          }`}
                        >
                          {isMorning ? (
                            <Sun className="w-3 h-3 text-amber-600" />
                          ) : (
                            <Moon className="w-3 h-3 text-indigo-600" />
                          )}
                          {item.shift}
                        </span>
                      </td>

                      {/* Submission Status */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-200">
                        {sub ? (
                          <div className="flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Submitted
                            </span>
                            <span
                              className="text-[10px] text-slate-600 mt-0.5 font-medium truncate max-w-[120px]"
                              title={sub.accessedBy || sub.hodCoordinator}
                            >
                              By: {sub.accessedBy || sub.hodCoordinator}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-500" />
                            Awaiting Entry
                          </span>
                        )}
                      </td>

                      {/* Subjects Count */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-200">
                        {summary ? (
                          <span className="font-semibold text-slate-800">
                            {summary.uploaded} / {summary.totalSubjects}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* Upload % */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-200">
                        {summary && summary.totalSubjects > 0 ? (
                          <div className="flex flex-col items-center">
                            <span
                              className={`text-xs font-bold ${
                                summary.uploadPercentage === 100
                                  ? 'text-emerald-700'
                                  : summary.uploadPercentage > 50
                                  ? 'text-blue-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {summary.uploadPercentage}%
                            </span>
                            <div className="w-16 bg-slate-200 rounded-full h-1 mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  summary.uploadPercentage === 100
                                    ? 'bg-emerald-600'
                                    : 'bg-blue-600'
                                }`}
                                style={{ width: `${summary.uploadPercentage}%` }}
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
                          id={`btn-inspect-${item.program.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${item.shift.toLowerCase()}`}
                          type="button"
                          onClick={() => onSelectProgramToEdit(item.department, item.program, item.shift, currentSession)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 rounded border border-emerald-300 transition-colors inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Inspect Sheet
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
    </div>
  );
};
