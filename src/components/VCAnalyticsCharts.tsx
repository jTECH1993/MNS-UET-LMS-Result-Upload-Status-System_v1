import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Building2
} from 'lucide-react';
import { SubmissionRecord, AcademicShift } from '../types';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import { StorageService } from '../services/storageService';

interface VCAnalyticsChartsProps {
  allRecords: SubmissionRecord[];
  currentSession: string;
  activeSessions: string[];
  selectedSemesterFilter: string;
  selectedShiftFilter: 'ALL' | AcademicShift;
  selectedSectionFilter: string;
  onFilterByDepartment?: (deptName: string) => void;
  onFilterByStatus?: (status: 'ALL' | 'SUBMITTED' | 'PENDING') => void;
  onFilterBySection?: (section: string) => void;
  onInspectProgram?: (dept: string, prog: string, shift: AcademicShift, sess: string, sem: string, sec: string) => void;
}

const COLORS = {
  uploaded: '#059669', // Emerald 600
  pending: '#dc2626', // Red 600
  inProgress: '#2563eb', // Blue 600
};

export const VCAnalyticsCharts: React.FC<VCAnalyticsChartsProps> = ({
  allRecords,
  currentSession,
  activeSessions,
  selectedSemesterFilter,
  selectedShiftFilter,
  selectedSectionFilter,
  onFilterByDepartment,
  onFilterByStatus,
}) => {
  const effectiveSessions = activeSessions.length > 0 ? activeSessions : [currentSession];

  // 1. Calculate Program-Level Data First
  const programLevelData = useMemo(() => {
    const list: any[] = [];
    UNIVERSITY_DEPARTMENTS.forEach((dept) => {
      const activeProgNames = Array.from(
        new Set(effectiveSessions.flatMap((s) => StorageService.getSessionPrograms(dept.name, s)))
      );
      
      dept.programs.forEach((prog) => {
        if (!activeProgNames.includes(prog.name)) return;
        
        let uploaded = 0;
        let pending = 0;
        let inProgress = 0;
        let total = 0;
        let hasData = false;

        const matching = allRecords.filter((r) => {
          if (r.department !== dept.name) return false;
          if (r.program !== prog.name) return false;
          if (!effectiveSessions.includes(r.session || '2023')) return false;
          if (selectedShiftFilter !== 'ALL' && (r.shift || 'Morning') !== selectedShiftFilter) return false;
          if (selectedSemesterFilter !== 'ALL' && (r.semester || '1') !== selectedSemesterFilter) return false;
          if (
            selectedSectionFilter !== 'ALL' &&
            (r.section || 'A').trim().toUpperCase() !== selectedSectionFilter.trim().toUpperCase()
          ) {
            return false;
          }
          return true;
        });

        matching.forEach((r) => {
          if (r.subjects && r.subjects.length > 0) {
            hasData = true;
            const summary = StorageService.calculateSummary(r.subjects);
            uploaded += summary.uploaded;
            pending += summary.pending;
            inProgress += summary.inProgress;
            total += summary.totalSubjects;
          }
        });

        // If no data has been uploaded yet, it just remains at 0 until the HOD enters it dynamically.
        if (!hasData) {
           total = 0;
           pending = 0;
           uploaded = 0;
           inProgress = 0;
        }

        const percentage = total > 0 ? Math.round((uploaded / total) * 100) : 0;
        
        list.push({
          deptCode: dept.code,
          deptName: dept.name,
          program: prog.name,
          displayName: `${dept.code} - ${prog.name.substring(0, 20)}`,
          Uploaded: uploaded,
          Pending: pending,
          'In Progress': inProgress,
          Total: total,
          Percentage: percentage,
          isSubmitted: uploaded > 0 || inProgress > 0
        });
      });
    });
    return list.sort((a, b) => b.Percentage - a.Percentage || b.Total - a.Total);
  }, [allRecords, effectiveSessions, selectedSemesterFilter, selectedShiftFilter, selectedSectionFilter]);

  // 2. Roll up to Department Level
  const deptPerformanceData = useMemo(() => {
    return UNIVERSITY_DEPARTMENTS.map((dept) => {
      const deptProgs = programLevelData.filter(p => p.deptName === dept.name);
      const total = deptProgs.reduce((acc, curr) => acc + curr.Total, 0);
      const uploaded = deptProgs.reduce((acc, curr) => acc + curr.Uploaded, 0);
      const pending = deptProgs.reduce((acc, curr) => acc + curr.Pending, 0);
      const inProgress = deptProgs.reduce((acc, curr) => acc + curr['In Progress'], 0);
      const percentage = total > 0 ? Math.round((uploaded / total) * 100) : 0;

      return {
        name: dept.code,
        fullName: dept.name,
        Uploaded: uploaded,
        Pending: pending,
        'In Progress': inProgress,
        Total: total,
        Percentage: percentage,
      };
    }).sort((a, b) => b.Total - a.Total); // Sort by total load to make it cleaner
  }, [programLevelData]);

  const aggregateKPIs = useMemo(() => {
    const total = deptPerformanceData.reduce((acc, curr) => acc + curr.Total, 0);
    const uploaded = deptPerformanceData.reduce((acc, curr) => acc + curr.Uploaded, 0);
    const pending = deptPerformanceData.reduce((acc, curr) => acc + curr.Pending, 0);
    const inProgress = deptPerformanceData.reduce((acc, curr) => acc + curr['In Progress'], 0);
    const pct = total > 0 ? Math.round((uploaded / total) * 100) : 0;
    return { uploadPercentage: pct, totalSubjects: total, totalUploaded: uploaded, totalPending: pending, inProgress };
  }, [deptPerformanceData]);

  const topDepartment = useMemo(() => {
    const deptsWithData = deptPerformanceData.filter((d) => d.Total > 0);
    if (deptsWithData.length === 0) return null;
    return [...deptsWithData].sort((a, b) => b.Percentage - a.Percentage)[0];
  }, [deptPerformanceData]);

  // Derived datasets for the charts
  const submittedProgramsChartData = programLevelData.filter(p => p.isSubmitted);
  const pendingProgramsChartData = programLevelData.filter(p => !p.isSubmitted || p.Pending > 0);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* KPI Cards Row with Interactive Quick-Filters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => onFilterByStatus?.('ALL')}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs cursor-pointer hover:border-emerald-500 hover:ring-2 hover:ring-emerald-500/20 transition-all group"
          title="Click to view all courses in roster"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              LMS Upload Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {aggregateKPIs.uploadPercentage}%
            </span>
            <span className="text-xs text-slate-500 font-medium">overall compliance</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all"
              style={{ width: `${aggregateKPIs.uploadPercentage}%` }}
            />
          </div>
        </div>

        <div
          onClick={() => onFilterByStatus?.('SUBMITTED')}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs cursor-pointer hover:border-emerald-500 hover:ring-2 hover:ring-emerald-500/20 transition-all group"
          title="Click to filter roster by verified submitted programs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Verified Uploaded
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {aggregateKPIs.totalUploaded}
            </span>
            <span className="text-xs text-slate-500 font-medium">courses in LMS</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-2 block">
            Click to view submitted program list
          </span>
        </div>

        <div
          onClick={() => onFilterByStatus?.('PENDING')}
          className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-900 shadow-2xs cursor-pointer hover:border-amber-500 hover:ring-2 hover:ring-amber-500/20 transition-all group"
          title="Click to filter roster by pending/delayed programs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Pending Action
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700 dark:text-amber-500">
              {aggregateKPIs.totalPending}
            </span>
            <span className="text-xs text-amber-700/80 font-medium">courses delayed</span>
          </div>
          <span className="text-[11px] text-amber-600 font-medium mt-2 block">
            {aggregateKPIs.inProgress} in progress &bull; Click to view pending programs
          </span>
        </div>

        <div
          onClick={() => topDepartment && onFilterByDepartment?.(topDepartment.name)}
          className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 shadow-2xs cursor-pointer hover:border-indigo-500 hover:ring-2 hover:ring-indigo-500/20 transition-all group"
          title={topDepartment ? `Click to filter roster by ${topDepartment.name}` : ''}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
              Top Department
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700 dark:text-indigo-400 line-clamp-1">
              {topDepartment ? topDepartment.name : 'N/A'}
            </span>
          </div>
          <span className="text-[11px] text-indigo-600 font-medium mt-2 block">
            {topDepartment ? `${topDepartment.Percentage}% completion \u2022 Click to view roster` : 'No data yet'}
          </span>
        </div>
      </div>

      {/* Clear Charts based on user request: Submitted vs Pending Programs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Department & Program Submission Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Programs: Submitted Results
              </h3>
            </div>
          </div>
          <div className="h-[350px] w-full pt-2">
            {submittedProgramsChartData.length === 0 ? (
               <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No programs have submitted results yet.
               </div>
            ) : (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart
                   data={submittedProgramsChartData}
                   layout="vertical"
                   margin={{ top: 0, right: 20, left: 20, bottom: 0 }}
                 >
                   <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.6} />
                   <XAxis type="number" hide />
                   <YAxis type="category" dataKey="displayName" width={140} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                   <Tooltip
                     contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '12px', border: 'none' }}
                     itemStyle={{ color: '#fff' }}
                   />
                   <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                   <Bar dataKey="Uploaded" name="Courses Uploaded" stackId="a" fill={COLORS.uploaded} radius={[0, 4, 4, 0]} barSize={20} />
                   <Bar dataKey="In Progress" name="Partially Uploaded" stackId="a" fill={COLORS.inProgress} radius={[0, 4, 4, 0]} barSize={20} />
                 </BarChart>
               </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Pending Programs Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Programs: Pending / Missing Results
              </h3>
            </div>
          </div>
          <div className="h-[350px] w-full pt-2">
            {pendingProgramsChartData.length === 0 ? (
               <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> All programs have uploaded successfully!</span>
               </div>
            ) : (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart
                   data={pendingProgramsChartData}
                   layout="vertical"
                   margin={{ top: 0, right: 20, left: 20, bottom: 0 }}
                 >
                   <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.6} />
                   <XAxis type="number" hide />
                   <YAxis type="category" dataKey="displayName" width={140} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                   <Tooltip
                     contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '12px', border: 'none' }}
                     itemStyle={{ color: '#fff' }}
                   />
                   <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                   <Bar dataKey="Pending" name="Courses Delayed" stackId="a" fill={COLORS.pending} radius={[0, 4, 4, 0]} barSize={20} />
                 </BarChart>
               </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
