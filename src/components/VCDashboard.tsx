import React, { useState, useMemo } from 'react';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import { StorageService } from '../services/storageService';
import { SubmissionRecord } from '../types';
import { Session2023SelectorModal } from './Session2023SelectorModal';
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
} from 'lucide-react';

interface Props {
  onSelectProgramToEdit: (department: string, program: string) => void;
  allRecords: SubmissionRecord[];
}

export const VCDashboard: React.FC<Props> = ({ onSelectProgramToEdit, allRecords }) => {
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'PENDING'>('ALL');
  const [onlySession2023Filter, setOnlySession2023Filter] = useState<boolean>(true);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false);
  const [rosterDept, setRosterDept] = useState<string>(UNIVERSITY_DEPARTMENTS[0].name);
  const [rosterVersion, setRosterVersion] = useState<number>(0);

  // Map of submissions by unique key
  const recordMap = useMemo(() => {
    const map = new Map<string, SubmissionRecord>();
    allRecords.forEach((r) => {
      map.set(`${r.department.trim()}__${r.program.trim()}`, r);
    });
    return map;
  }, [allRecords]);

  // Aggregate university totals using persistent Session 2023 roster
  const allUniversityPrograms = useMemo(() => {
    const list: {
      department: string;
      deptCode: string;
      program: string;
      degreeLevel: string;
      session2023: boolean;
      submission: SubmissionRecord | null;
    }[] = [];

    UNIVERSITY_DEPARTMENTS.forEach((dept) => {
      const active2023Names = StorageService.getSession2023Programs(dept.name);
      dept.programs.forEach((prog) => {
        const isSession2023Active = active2023Names.includes(prog.name);
        const sub = recordMap.get(`${dept.name.trim()}__${prog.name.trim()}`) || null;
        list.push({
          department: dept.name,
          deptCode: dept.code,
          program: prog.name,
          degreeLevel: prog.degreeLevel,
          session2023: isSession2023Active,
          submission: sub,
        });
      });
    });

    return list;
  }, [recordMap, rosterVersion]);

  // High-level statistics (Accurate Genuine Metrics based on active Session 2023 selection)
  const stats = useMemo(() => {
    const totalDepartments = UNIVERSITY_DEPARTMENTS.length;
    
    // Genuine tracked program set (Session 2023 cohorts only when filter is on)
    const trackedPrograms = onlySession2023Filter
      ? allUniversityPrograms.filter((p) => p.session2023)
      : allUniversityPrograms;

    const totalPrograms = trackedPrograms.length;
    const submittedPrograms = trackedPrograms.filter((p) => p.submission !== null).length;
    const pendingPrograms = totalPrograms - submittedPrograms;

    let totalSubjectsAcrossUni = 0;
    let totalUploadedAcrossUni = 0;
    let totalPendingAcrossUni = 0;
    let totalInProgressAcrossUni = 0;

    trackedPrograms.forEach((p) => {
      if (p.submission) {
        const sum = StorageService.calculateSummary(p.submission.subjects);
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

    const programSubmissionPercentage =
      totalPrograms > 0
        ? Math.round((submittedPrograms / totalPrograms) * 100)
        : 0;

    return {
      totalDepartments,
      totalPrograms,
      submittedPrograms,
      pendingPrograms,
      programSubmissionPercentage,
      totalSubjectsAcrossUni,
      totalUploadedAcrossUni,
      totalPendingAcrossUni,
      totalInProgressAcrossUni,
      uniUploadPercentage,
    };
  }, [allUniversityPrograms, onlySession2023Filter]);

  // Filtered program list
  const filteredPrograms = useMemo(() => {
    return allUniversityPrograms.filter((item) => {
      if (onlySession2023Filter && !item.session2023) return false;
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
        item.degreeLevel.toLowerCase().includes(query);

      return matchDept && matchStatus && matchSearch;
    });
  }, [allUniversityPrograms, onlySession2023Filter, selectedDeptFilter, statusFilter, searchQuery]);

  return (
    <div id="vc-admin-dashboard" className="space-y-6">
      {/* VC Dashboard Header Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-lg border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">
              Executive Monitoring
            </span>
            <span className="text-slate-400 text-xs">Session 2023 – Semester 1</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">
            Vice Chancellor & Deans Overview Dashboard
          </h2>
          <p className="text-xs text-slate-300">
            Real-time status of LMS result submissions across all faculties, schools, and academic
            departments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-export-university-master-csv"
            type="button"
            onClick={() => StorageService.exportCSV()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-2 transition-colors"
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
            Program Submissions
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-900">
              {stats.submittedPrograms} / {stats.totalPrograms}
            </span>
            <span className="text-xs font-bold text-emerald-700">
              {Math.round((stats.submittedPrograms / stats.totalPrograms) * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all"
              style={{
                width: `${(stats.submittedPrograms / stats.totalPrograms) * 100}%`,
              }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {stats.pendingPrograms} programs awaiting HOD entry
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
            Across {stats.submittedPrograms} submitted academic programs
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
              <option value="SUBMITTED">Submitted in Database ({stats.submittedPrograms})</option>
              <option value="PENDING">Pending Submission ({stats.pendingPrograms})</option>
            </select>
          </div>

          {/* Session 2023 Cohort Toggle */}
          <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-slate-700 font-semibold bg-emerald-50/70 px-2.5 py-1.5 rounded-md border border-emerald-300 hover:bg-emerald-100 transition-colors">
            <input
              type="checkbox"
              checked={onlySession2023Filter}
              onChange={(e) => setOnlySession2023Filter(e.target.checked)}
              className="rounded text-emerald-700 focus:ring-emerald-600 w-3.5 h-3.5"
            />
            <span className="text-emerald-950">Session 2023 Cohorts Only</span>
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
            placeholder="Search department or program..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Session 2023 Genuine Tracking Notice */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2.5 text-emerald-950">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
          <div>
            <span className="font-bold">Session 2023 Genuine Status Active: </span>
            <span>
              Monitoring only active programs enrolled for Session 2023 (e.g. 2 programs in Computer Science). Un-offered
              programs are excluded from calculation, ensuring genuine 100% completion when all active cohorts submit.
            </span>
          </div>
        </div>
        <button
          id="btn-vc-configure-roster"
          type="button"
          onClick={() => {
            setRosterDept(selectedDeptFilter !== 'ALL' ? selectedDeptFilter : UNIVERSITY_DEPARTMENTS[0].name);
            setIsRosterModalOpen(true);
          }}
          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-md shadow-2xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Configure 2023 Programs ({stats.totalPrograms} Monitored)</span>
        </button>
      </div>

      {/* Program Status Table */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-sm">
              Academic Programs LMS Result Upload Roster ({filteredPrograms.length})
            </h3>
          </div>
          <span className="text-xs text-slate-300">
            Click "Inspect Sheet" to view or edit full course rows in HOD view
          </span>
        </div>

        <div className="overflow-x-auto">
          <table id="vc-roster-table" className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold tracking-wider border-b border-slate-300 text-[11px] uppercase">
                <th className="py-2.5 px-3 border-r border-slate-300">Department / School</th>
                <th className="py-2.5 px-3 border-r border-slate-300">Degree Program</th>
                <th className="py-2.5 px-2 border-r border-slate-300 text-center w-24">Level</th>
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
              {filteredPrograms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-sm">
                    No programs found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredPrograms.map((item, index) => {
                  const sub = item.submission;
                  const summary = sub ? StorageService.calculateSummary(sub.subjects) : null;

                  return (
                    <tr
                      key={`${item.department}-${item.program}-${index}`}
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
                          {item.session2023 ? (
                            <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-200">
                              Session 2023 Active
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
                          id={`btn-inspect-${item.program.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                          type="button"
                          onClick={() => onSelectProgramToEdit(item.department, item.program)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 rounded border border-emerald-300 transition-colors inline-flex items-center gap-1 shadow-2xs"
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

      {/* Session 2023 Program Roster Selector Modal */}
      <Session2023SelectorModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        departmentName={rosterDept}
        onRosterUpdated={() => {
          setRosterVersion((v) => v + 1);
        }}
      />
    </div>
  );
};
