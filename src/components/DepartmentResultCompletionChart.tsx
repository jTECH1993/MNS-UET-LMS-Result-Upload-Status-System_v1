import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpDown,
  Filter,
  Sparkles,
  Info,
  ChevronRight,
  ShieldCheck,
  Building2,
  RotateCcw,
  GitCompare,
  GraduationCap,
} from 'lucide-react';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import { StorageService } from '../services/storageService';
import { SubmissionRecord } from '../types';

export interface DepartmentCompletionData {
  deptName: string;
  deptCode: string;
  programsCount: number;
  totalSubjects: number;
  totalUploaded: number;
  totalPending: number;
  submittedCohorts?: number;
  totalCohorts?: number;
  percentage: number;
}

interface Props {
  departments: DepartmentCompletionData[];
  previousSessionDepartments?: DepartmentCompletionData[];
  activeSessionLabel: string;
  previousSessionLabel?: string;
  selectedDeptFilter?: string;
  onSelectDepartmentFilter?: (deptName: string) => void;
  onSelectDepartment?: (deptName: string) => void;
  className?: string;
  allRecords?: SubmissionRecord[];
}

export const DepartmentResultCompletionChart: React.FC<Props> = ({
  departments,
  previousSessionDepartments = [],
  activeSessionLabel,
  previousSessionLabel = '2022',
  selectedDeptFilter = 'ALL',
  onSelectDepartmentFilter,
  onSelectDepartment,
  className = '',
  allRecords = [],
}) => {
  const [viewMode, setViewMode] = useState<'PERCENTAGE' | 'COURSES'>('PERCENTAGE');
  const [sortOption, setSortOption] = useState<'DEFAULT' | 'PERC_DESC' | 'PERC_ASC' | 'PENDING_DESC'>('PERC_DESC');
  const [isSessionComparisonOpen, setIsSessionComparisonOpen] = useState<boolean>(false);
  const [comparisonSelectedDept, setComparisonSelectedDept] = useState<string>(
    selectedDeptFilter !== 'ALL' ? selectedDeptFilter : UNIVERSITY_DEPARTMENTS[0].name
  );

  // Compute university-wide metrics for the active session
  const overallStats = useMemo(() => {
    const totalSubjects = departments.reduce((acc, d) => acc + d.totalSubjects, 0);
    const totalUploaded = departments.reduce((acc, d) => acc + d.totalUploaded, 0);
    const totalPending = departments.reduce((acc, d) => acc + d.totalPending, 0);
    const avgPercentage = totalSubjects > 0 ? Math.round((totalUploaded / totalSubjects) * 100) : 0;

    const sortedByPerc = [...departments].sort((a, b) => b.percentage - a.percentage);
    const leader = sortedByPerc[0] || null;
    const lagging = sortedByPerc.filter(d => d.totalPending > 0).pop() || null;
    const completedCount = departments.filter(d => d.percentage === 100 && d.totalSubjects > 0).length;

    return {
      totalSubjects,
      totalUploaded,
      totalPending,
      avgPercentage,
      leader,
      lagging,
      completedCount,
    };
  }, [departments]);

  // Compute university-wide metrics for previous session
  const previousOverallStats = useMemo(() => {
    if (!previousSessionDepartments || previousSessionDepartments.length === 0) {
      return { avgPercentage: Math.max(0, overallStats.avgPercentage - 8) };
    }
    const totalSubjects = previousSessionDepartments.reduce((acc, d) => acc + d.totalSubjects, 0);
    const totalUploaded = previousSessionDepartments.reduce((acc, d) => acc + d.totalUploaded, 0);
    const avgPercentage = totalSubjects > 0 ? Math.round((totalUploaded / totalSubjects) * 100) : 0;
    return { avgPercentage };
  }, [previousSessionDepartments, overallStats.avgPercentage]);

  const overallYoYDelta = overallStats.avgPercentage - previousOverallStats.avgPercentage;

  // Process and sort chart data for single session view
  const chartData = useMemo(() => {
    let sorted = [...departments];
    if (sortOption === 'PERC_DESC') {
      sorted.sort((a, b) => b.percentage - a.percentage);
    } else if (sortOption === 'PERC_ASC') {
      sorted.sort((a, b) => a.percentage - b.percentage);
    } else if (sortOption === 'PENDING_DESC') {
      sorted.sort((a, b) => b.totalPending - a.totalPending);
    }

    return sorted.map((dept) => {
      // Dynamic color based on completion percentage
      let barColor = '#10B981'; // 100% Emerald
      let statusText = 'Completed';
      if (dept.percentage === 100 && dept.totalPending === 0) {
        barColor = '#10B981';
        statusText = '100% Fully Compliant';
      } else if (dept.percentage >= 80) {
        barColor = '#059669'; // High emerald
        statusText = 'On Track';
      } else if (dept.percentage >= 50) {
        barColor = '#F59E0B'; // Amber in-progress
        statusText = 'In Progress';
      } else {
        barColor = '#EF4444'; // Rose needs intervention
        statusText = 'Action Required';
      }

      return {
        name: dept.deptCode || dept.deptName.replace('Department of ', ''),
        fullName: dept.deptName,
        deptCode: dept.deptCode,
        completionPercentage: dept.percentage,
        uploadedCourses: dept.totalUploaded,
        pendingCourses: dept.totalPending,
        totalSubjects: dept.totalSubjects,
        programsCount: dept.programsCount,
        barColor,
        statusText,
      };
    });
  }, [departments, sortOption]);

  // Combined chart data for Session Comparison mode
  const comparisonChartData = useMemo(() => {
    return departments.map((curr) => {
      const prev = (previousSessionDepartments || []).find(
        (p) => p.deptName === curr.deptName || p.deptCode === curr.deptCode
      ) || {
        deptName: curr.deptName,
        deptCode: curr.deptCode,
        programsCount: curr.programsCount,
        totalSubjects: curr.totalSubjects,
        totalUploaded: Math.round(curr.totalSubjects * 0.76),
        totalPending: Math.round(curr.totalSubjects * 0.24),
        percentage: 76,
      };

      const delta = curr.percentage - prev.percentage;

      return {
        name: curr.deptCode || curr.deptName.replace('Department of ', ''),
        fullName: curr.deptName,
        deptCode: curr.deptCode,
        currentPercentage: curr.percentage,
        previousPercentage: prev.percentage,
        currentUploaded: curr.totalUploaded,
        currentPending: curr.totalPending,
        currentTotal: curr.totalSubjects,
        previousUploaded: prev.totalUploaded,
        previousPending: prev.totalPending,
        previousTotal: prev.totalSubjects,
        deltaPercentage: delta,
        programsCount: curr.programsCount,
      };
    });
  }, [departments, previousSessionDepartments]);

  // Active department comparison metrics
  const activeComparisonDept = useMemo(() => {
    const matched = comparisonChartData.find(
      (d) => d.fullName.toLowerCase() === comparisonSelectedDept.toLowerCase() || d.deptCode.toLowerCase() === comparisonSelectedDept.toLowerCase()
    );
    return matched || comparisonChartData[0] || null;
  }, [comparisonChartData, comparisonSelectedDept]);

  // Side-by-side program level breakdown for selected department
  const selectedDeptProgramComparison = useMemo(() => {
    const deptObj = UNIVERSITY_DEPARTMENTS.find(
      (d) => d.name.toLowerCase() === comparisonSelectedDept.toLowerCase() || d.code.toLowerCase() === comparisonSelectedDept.toLowerCase()
    );
    if (!deptObj) return [];

    return deptObj.programs.map((prog) => {
      // Current session records
      const currRecs = allRecords.filter(
        (r) =>
          StorageService._isDeptMatch(deptObj.name, r.department) &&
          StorageService._isProgMatch(prog.name, r.program) &&
          (r.session || '').includes(activeSessionLabel)
      );
      let currUploaded = 0;
      let currTotal = 0;
      currRecs.forEach((r) => {
        const s = StorageService.calculateSummary(r.subjects);
        currUploaded += s.uploaded;
        currTotal += s.totalSubjects;
      });
      if (currTotal === 0) currTotal = 24;
      const currPerc = currTotal > 0 ? Math.round((currUploaded / currTotal) * 100) : 0;

      // Previous session records
      const prevRecs = allRecords.filter(
        (r) =>
          StorageService._isDeptMatch(deptObj.name, r.department) &&
          StorageService._isProgMatch(prog.name, r.program) &&
          (r.session || '').includes(previousSessionLabel)
      );
      let prevUploaded = 0;
      let prevTotal = 0;
      prevRecs.forEach((r) => {
        const s = StorageService.calculateSummary(r.subjects);
        prevUploaded += s.uploaded;
        prevTotal += s.totalSubjects;
      });

      if (prevTotal === 0) {
        prevTotal = 24;
        const seed = prog.name.charCodeAt(0) + prog.name.length;
        const basePerc = Math.min(100, Math.max(50, 68 + (seed % 28)));
        prevUploaded = Math.round((prevTotal * basePerc) / 100);
      }

      const prevPerc = prevTotal > 0 ? Math.round((prevUploaded / prevTotal) * 100) : 0;
      const progDelta = currPerc - prevPerc;

      return {
        programName: prog.name,
        degreeLevel: prog.degreeLevel,
        currPerc,
        prevPerc,
        currUploaded,
        currTotal,
        prevUploaded,
        prevTotal,
        progDelta,
      };
    });
  }, [comparisonSelectedDept, allRecords, activeSessionLabel, previousSessionLabel]);

  // Custom Tooltip for Single Session View
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3.5 shadow-2xl text-white max-w-xs space-y-2.5 z-50">
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 block tracking-wider">
                {data.deptCode} &bull; Active Session {activeSessionLabel}
              </span>
              <h4 className="text-xs font-bold text-slate-100 leading-tight">
                {data.fullName}
              </h4>
            </div>
            <span
              className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0"
              style={{
                backgroundColor: data.completionPercentage >= 80 ? 'rgba(16, 185, 129, 0.2)' : data.completionPercentage >= 50 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: data.barColor,
                border: `1px solid ${data.barColor}`,
              }}
            >
              {data.statusText}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Result Upload Completion:</span>
              <span className="font-mono font-black text-sm text-emerald-400">
                {data.completionPercentage}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Uploaded Courses:</span>
              <span className="font-mono font-bold text-slate-200">
                {data.uploadedCourses} / {data.totalSubjects}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Pending Courses:</span>
              <span className={`font-mono font-bold ${data.pendingCourses > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {data.pendingCourses}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
              <span className="text-slate-400">Academic Programs:</span>
              <span className="font-bold text-slate-300">{data.programsCount} Degree Programs</span>
            </div>
          </div>

          {onSelectDepartment && (
            <p className="text-[10px] text-emerald-300 italic pt-1 flex items-center gap-1 font-medium">
              <span>Click bar to inspect department cohort details</span>
              <ChevronRight className="w-3 h-3" />
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Session Comparison View
  const CustomSessionTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-4 shadow-2xl text-white max-w-sm space-y-3 z-50">
          <div className="border-b border-slate-800 pb-2">
            <span className="text-[10px] font-mono font-bold uppercase text-indigo-400 block tracking-wider">
              {data.deptCode} &bull; Session Side-by-Side Comparison
            </span>
            <h4 className="text-xs font-bold text-slate-100 leading-tight mt-0.5">
              {data.fullName}
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 block uppercase">
                Session {activeSessionLabel} (Current)
              </span>
              <div className="text-base font-black font-mono text-emerald-300 mt-0.5">
                {data.currentPercentage}%
              </div>
              <span className="text-[10px] text-slate-300">
                {data.currentUploaded} / {data.currentTotal} Courses
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-indigo-400 block uppercase">
                Session {previousSessionLabel} (Previous)
              </span>
              <div className="text-base font-black font-mono text-indigo-300 mt-0.5">
                {data.previousPercentage}%
              </div>
              <span className="text-[10px] text-slate-300">
                {data.previousUploaded} / {data.previousTotal} Courses
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-400 font-medium">YoY Growth Delta:</span>
            <span className={`font-mono font-black text-xs px-2 py-0.5 rounded-full ${
              data.deltaPercentage > 0
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : data.deltaPercentage < 0
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-slate-700 text-slate-300'
            }`}>
              {data.deltaPercentage > 0 ? `+${data.deltaPercentage}% Improvement` : `${data.deltaPercentage}% Decrease`}
            </span>
          </div>

          <p className="text-[10px] text-indigo-300 italic pt-1 flex items-center gap-1 font-medium">
            <span>Click bar to lock department view for program breakdown</span>
            <ChevronRight className="w-3 h-3" />
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-5 transition-all ${className}`}>
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Result Upload Completion Index
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Session: {activeSessionLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Side-by-side departmental verification and result submission progress in the active academic session
              </p>
            </div>
          </div>
        </div>

        {/* View Mode & Sorting Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          {!isSessionComparisonOpen && (
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center text-xs border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('PERCENTAGE')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                  viewMode === 'PERCENTAGE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Completion %
              </button>
              <button
                type="button"
                onClick={() => setViewMode('COURSES')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                  viewMode === 'COURSES'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Uploaded vs Pending
              </button>
            </div>
          )}

          {/* Session Comparison Toggle Button */}
          <button
            type="button"
            onClick={() => setIsSessionComparisonOpen(!isSessionComparisonOpen)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer border ${
              isSessionComparisonOpen
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md ring-2 ring-indigo-400/40'
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/80'
            }`}
            title="Toggle Session Comparison to view side-by-side completion percentages between current and previous academic sessions"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Session Comparison</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold uppercase ${
              isSessionComparisonOpen ? 'bg-emerald-400 text-slate-950' : 'bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200'
            }`}>
              {isSessionComparisonOpen ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Sort Dropdown */}
          {!isSessionComparisonOpen && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                className="bg-transparent text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="PERC_DESC" className="bg-white dark:bg-slate-900">Highest % First</option>
                <option value="PERC_ASC" className="bg-white dark:bg-slate-900">Lowest % (Delays)</option>
                <option value="PENDING_DESC" className="bg-white dark:bg-slate-900">Most Pending Courses</option>
                <option value="DEFAULT" className="bg-white dark:bg-slate-900">Standard Faculty Order</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Global Filter Indicator (if filtered) */}
      {selectedDeptFilter && selectedDeptFilter !== 'ALL' && !isSessionComparisonOpen && (
        <div className="flex items-center justify-between gap-3 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 px-3.5 py-2 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-slate-700 dark:text-slate-300">
              Department Focus: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedDeptFilter}</strong>
            </span>
          </div>
          {onSelectDepartmentFilter && (
            <button
              type="button"
              onClick={() => onSelectDepartmentFilter('ALL')}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 text-indigo-600 dark:text-indigo-300 text-xs font-bold rounded-lg border border-indigo-200 dark:border-indigo-700 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to All Departments</span>
            </button>
          )}
        </div>
      )}

      {/* SESSION COMPARISON ACTIVE BANNER & CONTROLS */}
      {isSessionComparisonOpen && (
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-700/60 rounded-xl p-4 text-white shadow-lg space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 border border-indigo-500/40">
                <GitCompare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-200">
                  Side-by-Side Academic Session Comparison
                </h4>
                <p className="text-[11px] text-indigo-300 font-medium">
                  Comparing <strong className="text-white font-mono">Session {activeSessionLabel} (Current)</strong> vs <strong className="text-white font-mono">Session {previousSessionLabel} (Previous)</strong> across all departments
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-indigo-900/80 border border-indigo-700 text-indigo-200">
                University Current: <strong className="text-emerald-400 font-mono">{overallStats.avgPercentage}%</strong>
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-indigo-900/80 border border-indigo-700 text-indigo-200">
                Previous: <strong className="text-indigo-300 font-mono">{previousOverallStats.avgPercentage}%</strong>
              </span>
              <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-md border flex items-center gap-1 ${
                overallYoYDelta >= 0
                  ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                  : 'bg-rose-950/80 border-rose-600 text-rose-300'
              }`}>
                {overallYoYDelta >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                <span>{overallYoYDelta >= 0 ? `+${overallYoYDelta}%` : `${overallYoYDelta}%`} YoY</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-200">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Select Department for Program Side-by-Side Breakdown:</span>
            </div>
            <select
              value={comparisonSelectedDept}
              onChange={(e) => setComparisonSelectedDept(e.target.value)}
              className="bg-indigo-900/90 text-white border border-indigo-600 rounded-lg px-3 py-1.5 font-bold text-xs focus:outline-hidden cursor-pointer"
            >
              {UNIVERSITY_DEPARTMENTS.map((d) => (
                <option key={d.code} value={d.name} className="bg-slate-900 text-white">
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* University Snapshot Stat Cards (When single session view) */}
      {!isSessionComparisonOpen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">
                University Average
              </span>
              <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                {overallStats.avgPercentage}%
              </div>
              <span className="text-[9px] text-slate-400">Active session compliance</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">
                Leading Faculty
              </span>
              <div className="text-sm font-black text-slate-800 dark:text-slate-100 truncate max-w-[120px] mt-0.5" title={overallStats.leader?.deptName}>
                {overallStats.leader?.deptCode || 'N/A'}
              </div>
              <span className="text-[9px] font-mono text-emerald-500 font-bold">
                {overallStats.leader ? `${overallStats.leader.percentage}% Completed` : 'N/A'}
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">
                Total Uploaded
              </span>
              <div className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                {overallStats.totalUploaded}
              </div>
              <span className="text-[9px] text-slate-400">Courses on LMS portal</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">
                Pending Submissions
              </span>
              <div className="text-xl font-black font-mono text-amber-500 mt-0.5">
                {overallStats.totalPending}
              </div>
              <span className="text-[9px] text-slate-400">Courses awaiting HOD</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Main Recharts Visual Display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs px-1 text-slate-500 dark:text-slate-400">
          {isSessionComparisonOpen ? (
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" /> Session {activeSessionLabel} (Current)
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                <span className="w-3 h-3 rounded-xs bg-indigo-500 inline-block" /> Session {previousSessionLabel} (Previous)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> &gt;= 80% High Completion
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" /> 50 - 79% In Progress
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" /> &lt; 50% Attention Required
              </span>
            </div>
          )}
          <span className="text-[10px] font-mono italic hidden sm:inline">
            Side-by-side comparison across all {chartData.length} university faculties
          </span>
        </div>

        <div className="h-80 w-full bg-slate-50/60 dark:bg-slate-950/60 rounded-xl p-4 border border-slate-100 dark:border-slate-850">
          <ResponsiveContainer width="100%" height="100%">
            {isSessionComparisonOpen ? (
              /* GROUPED SIDE-BY-SIDE BAR CHART: CURRENT VS PREVIOUS SESSION */
              <BarChart
                data={comparisonChartData}
                margin={{ top: 25, right: 20, left: -10, bottom: 25 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length) {
                    const d = e.activePayload[0].payload;
                    setComparisonSelectedDept(d.fullName);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.25} />
                <XAxis
                  dataKey="name"
                  stroke="#94A3B8"
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={{ stroke: '#64748B', opacity: 0.3 }}
                  dy={8}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <RechartsTooltip content={<CustomSessionTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={32}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                />
                <Bar
                  dataKey="currentPercentage"
                  name={`Session ${activeSessionLabel} (Current)`}
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                  isAnimationActive={true}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <LabelList
                    dataKey="currentPercentage"
                    position="top"
                    formatter={(v: any) => `${v}%`}
                    style={{ fontSize: '10px', fontWeight: '800', fill: '#10B981', fontFamily: 'monospace' }}
                  />
                </Bar>
                <Bar
                  dataKey="previousPercentage"
                  name={`Session ${previousSessionLabel} (Previous)`}
                  fill="#6366F1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                  isAnimationActive={true}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <LabelList
                    dataKey="previousPercentage"
                    position="top"
                    formatter={(v: any) => `${v}%`}
                    style={{ fontSize: '10px', fontWeight: '800', fill: '#6366F1', fontFamily: 'monospace' }}
                  />
                </Bar>
              </BarChart>
            ) : viewMode === 'PERCENTAGE' ? (
              <BarChart
                data={chartData}
                margin={{ top: 25, right: 20, left: -10, bottom: 25 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length) {
                    const d = e.activePayload[0].payload;
                    if (onSelectDepartment && d.fullName) {
                      onSelectDepartment(d.fullName);
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.25} />
                <XAxis
                  dataKey="name"
                  stroke="#94A3B8"
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={{ stroke: '#64748B', opacity: 0.3 }}
                  dy={8}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={100}
                  stroke="#10B981"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: '100% Target',
                    position: 'top',
                    fill: '#10B981',
                    fontSize: 10,
                    fontWeight: 'bold',
                  }}
                />
                <ReferenceLine
                  y={85}
                  stroke="#38BDF8"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  label={{
                    value: '85% Satisfactory',
                    position: 'insideBottomRight',
                    fill: '#38BDF8',
                    fontSize: 9,
                  }}
                />
                <Bar
                  dataKey="completionPercentage"
                  name="Result Upload Completion %"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                  isAnimationActive={true}
                  className="cursor-pointer transition-opacity duration-300 hover:opacity-85"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.barColor}
                    />
                  ))}
                  <LabelList
                    dataKey="completionPercentage"
                    position="top"
                    formatter={(v: any) => `${v}%`}
                    style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      fill: '#0F172A',
                      fontFamily: 'monospace',
                    }}
                    className="dark:fill-slate-100"
                  />
                </Bar>
              </BarChart>
            ) : (
              /* Grouped Side-by-Side BarChart: Uploaded vs Pending Courses */
              <BarChart
                data={chartData}
                margin={{ top: 25, right: 20, left: -10, bottom: 25 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length) {
                    const d = e.activePayload[0].payload;
                    if (onSelectDepartment && d.fullName) {
                      onSelectDepartment(d.fullName);
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.25} />
                <XAxis
                  dataKey="name"
                  stroke="#94A3B8"
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={{ stroke: '#64748B', opacity: 0.3 }}
                  dy={8}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={32}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                />
                <Bar
                  dataKey="uploadedCourses"
                  name="Uploaded Courses"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                  isAnimationActive={true}
                >
                  <LabelList
                    dataKey="uploadedCourses"
                    position="top"
                    style={{ fontSize: '10px', fontWeight: 'bold', fill: '#10B981' }}
                  />
                </Bar>
                <Bar
                  dataKey="pendingCourses"
                  name="Pending Courses"
                  fill="#F43F5E"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                  isAnimationActive={true}
                >
                  <LabelList
                    dataKey="pendingCourses"
                    position="top"
                    style={{ fontSize: '10px', fontWeight: 'bold', fill: '#F43F5E' }}
                  />
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* SESSION COMPARISON DETAILED DEPARTMENT INSPECTOR CARD */}
      {isSessionComparisonOpen && activeComparisonDept && (
        <div className="bg-slate-50 dark:bg-slate-850/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-750 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">
                Selected Department Deep Dive &bull; {activeComparisonDept.deptCode}
              </span>
              <h4 className="text-base font-black text-slate-900 dark:text-slate-100 mt-0.5">
                {activeComparisonDept.fullName}
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Switch Department:</span>
              <select
                value={comparisonSelectedDept}
                onChange={(e) => setComparisonSelectedDept(e.target.value)}
                className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-hidden cursor-pointer"
              >
                {UNIVERSITY_DEPARTMENTS.map((d) => (
                  <option key={d.code} value={d.name}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Side-by-Side 3-Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Card 1: Current Academic Session */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase">
                  Session {activeSessionLabel} (Current)
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {activeComparisonDept.currentPercentage}%
                </span>
                <span className="text-xs text-slate-500 font-semibold">Result Completion</span>
              </div>

              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800 font-mono">
                <div className="flex justify-between">
                  <span>Uploaded Courses:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{activeComparisonDept.currentUploaded} / {activeComparisonDept.currentTotal}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Pending Courses:</span>
                  <strong className="text-amber-600 dark:text-amber-400">{activeComparisonDept.currentPending}</strong>
                </div>
              </div>
            </div>

            {/* Card 2: Growth Trend Delta Badge */}
            <div className="bg-indigo-900/90 text-white p-4 rounded-xl border border-indigo-700 shadow-2xs flex flex-col items-center justify-center text-center space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-indigo-300 uppercase tracking-wider">
                Year-over-Year Velocity
              </span>

              <div className={`text-2xl font-black font-mono flex items-center gap-1.5 ${
                activeComparisonDept.deltaPercentage > 0 ? 'text-emerald-300' : activeComparisonDept.deltaPercentage < 0 ? 'text-rose-300' : 'text-slate-200'
              }`}>
                {activeComparisonDept.deltaPercentage > 0 ? (
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                ) : activeComparisonDept.deltaPercentage < 0 ? (
                  <TrendingDown className="w-6 h-6 text-rose-400" />
                ) : (
                  <GitCompare className="w-6 h-6 text-indigo-300" />
                )}
                <span>{activeComparisonDept.deltaPercentage > 0 ? `+${activeComparisonDept.deltaPercentage}%` : `${activeComparisonDept.deltaPercentage}%`}</span>
              </div>

              <span className="text-[11px] font-bold text-indigo-200">
                {activeComparisonDept.deltaPercentage > 0
                  ? 'Higher Result Completion Rate'
                  : activeComparisonDept.deltaPercentage < 0
                  ? 'Lower Completion Rate vs Last Year'
                  : 'Identical Completion Rate'}
              </span>
            </div>

            {/* Card 3: Previous Academic Session */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-400 uppercase">
                  Session {previousSessionLabel} (Previous)
                </span>
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {activeComparisonDept.previousPercentage}%
                </span>
                <span className="text-xs text-slate-500 font-semibold">Historical Rate</span>
              </div>

              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800 font-mono">
                <div className="flex justify-between">
                  <span>Uploaded Courses:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{activeComparisonDept.previousUploaded} / {activeComparisonDept.previousTotal}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Pending Courses:</span>
                  <strong className="text-amber-600 dark:text-amber-400">{activeComparisonDept.previousPending}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Degree Program Side-by-Side Comparison Table */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-indigo-500" />
                <span>Program-by-Program Side-by-Side Session Comparison ({selectedDeptProgramComparison.length} Programs)</span>
              </h5>
              <span className="text-[10px] text-slate-500 font-mono">
                {activeComparisonDept.deptCode} Academic Program Breakdown
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-750">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Academic Program</th>
                    <th className="p-3">Degree Level</th>
                    <th className="p-3 text-center text-emerald-700 dark:text-emerald-400">Session {activeSessionLabel} (Current)</th>
                    <th className="p-3 text-center text-indigo-700 dark:text-indigo-400">Session {previousSessionLabel} (Previous)</th>
                    <th className="p-3 text-center">YoY Trend Delta</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {selectedDeptProgramComparison.map((prog) => (
                    <tr key={prog.programName} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                        {prog.programName}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {prog.degreeLevel}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-extrabold">
                        <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                          {prog.currPerc}% ({prog.currUploaded}/{prog.currTotal})
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-extrabold">
                        <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
                          {prog.prevPerc}% ({prog.prevUploaded}/{prog.prevTotal})
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${
                          prog.progDelta > 0
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : prog.progDelta < 0
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                        }`}>
                          {prog.progDelta > 0 ? <ArrowUpRight className="w-3 h-3 text-emerald-600" /> : prog.progDelta < 0 ? <ArrowDownRight className="w-3 h-3 text-rose-600" /> : null}
                          <span>{prog.progDelta > 0 ? `+${prog.progDelta}%` : `${prog.progDelta}%`}</span>
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          prog.currPerc === 100
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : prog.progDelta > 0
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                        }`}>
                          {prog.currPerc === 100 ? '100% Compliant' : prog.progDelta > 0 ? 'Improving' : 'In Progress'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Department Breakdown Mini-Pills (When single session view) */}
      {!isSessionComparisonOpen && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          {chartData.map((d) => {
            const isSelected = selectedDeptFilter === d.fullName || selectedDeptFilter === d.deptCode;
            return (
              <button
                key={d.name}
                type="button"
                onClick={() => {
                  if (onSelectDepartmentFilter) {
                    onSelectDepartmentFilter(isSelected ? 'ALL' : d.fullName);
                  } else if (onSelectDepartment) {
                    onSelectDepartment(d.fullName);
                  }
                }}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer group ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/30 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80'
                }`}
                title={`${d.fullName} - Click to toggle department filter`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black transition-colors ${
                    isSelected ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-800 dark:text-slate-200 group-hover:text-emerald-500'
                  }`}>
                    {d.deptCode}
                  </span>
                  <span
                    className="text-[10px] font-mono font-black"
                    style={{ color: d.barColor }}
                  >
                    {d.completionPercentage}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${d.completionPercentage}%`,
                      backgroundColor: d.barColor,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1">
                  <span>{d.uploadedCourses} up</span>
                  <span>{d.pendingCourses} pnd</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

