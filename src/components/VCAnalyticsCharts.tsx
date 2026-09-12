import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import { SubmissionRecord, AcademicShift } from '../types';
import { StorageService } from '../services/storageService';
import {
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  SlidersHorizontal,
  ArrowUpRight,
  ShieldAlert,
  Percent,
} from 'lucide-react';

interface Props {
  allRecords: SubmissionRecord[];
  currentSession: string;
  selectedSemesterFilter?: string;
  selectedShiftFilter?: 'ALL' | AcademicShift;
  onFilterByDepartment?: (deptName: string) => void;
  onFilterByStatus?: (status: 'ALL' | 'SUBMITTED' | 'PENDING') => void;
}

const COLORS = {
  uploaded: '#10b981', // emerald-500
  inProgress: '#3b82f6', // blue-500
  pending: '#f59e0b', // amber-500
  awaiting: '#94a3b8', // slate-400
};

export const VCAnalyticsCharts: React.FC<Props> = ({
  allRecords,
  currentSession,
  selectedSemesterFilter = 'ALL',
  selectedShiftFilter = 'ALL',
  onFilterByDepartment,
  onFilterByStatus,
}) => {
  const [chartViewTab, setChartViewTab] = useState<'ALL' | 'DEPTS' | 'SEMESTERS' | 'REASONS' | 'STATS'>('ALL');

  // Compute departmental performance stats
  const deptPerformanceData = useMemo(() => {
    return UNIVERSITY_DEPARTMENTS.map((dept) => {
      let uploaded = 0;
      let pending = 0;
      let inProgress = 0;
      let total = 0;

      dept.programs.forEach((prog) => {
        const shiftsToInspect: AcademicShift[] =
          selectedShiftFilter === 'ALL'
            ? ['Morning', 'Evening']
            : [selectedShiftFilter];

        shiftsToInspect.forEach((sh) => {
          const semsToInspect =
            selectedSemesterFilter === 'ALL'
              ? ['1', '2', '3', '4', '5', '6', '7', '8']
              : [selectedSemesterFilter];

          semsToInspect.forEach((sem) => {
            const sub = StorageService.getSubmission(
              dept.name,
              prog.name,
              prog.degreeLevel || 'BS',
              sh,
              currentSession,
              sem
            );
            if (sub && sub.subjects && sub.subjects.length > 0) {
              const summary = StorageService.calculateSummary(sub.subjects);
              uploaded += summary.uploaded;
              pending += summary.pending;
              inProgress += summary.inProgress;
              total += summary.totalSubjects;
            }
          });
        });
      });

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
    });
  }, [allRecords, currentSession, selectedSemesterFilter, selectedShiftFilter]);

  // Shift Comparison: Morning vs Evening
  const shiftComparison = useMemo(() => {
    let morningUploaded = 0;
    let morningTotal = 0;
    let eveningUploaded = 0;
    let eveningTotal = 0;

    allRecords.forEach((r) => {
      if (r.session === currentSession && r.subjects) {
        const sum = StorageService.calculateSummary(r.subjects);
        if (r.shift === 'Evening') {
          eveningUploaded += sum.uploaded;
          eveningTotal += sum.totalSubjects;
        } else {
          morningUploaded += sum.uploaded;
          morningTotal += sum.totalSubjects;
        }
      }
    });

    const morningRate = morningTotal > 0 ? Math.round((morningUploaded / morningTotal) * 100) : 0;
    const eveningRate = eveningTotal > 0 ? Math.round((eveningUploaded / eveningTotal) * 100) : 0;

    return {
      morningUploaded,
      morningTotal,
      morningRate,
      eveningUploaded,
      eveningTotal,
      eveningRate,
    };
  }, [allRecords, currentSession]);

  // Overall university result breakdown
  const statusDistributionData = useMemo(() => {
    let totalUploaded = 0;
    let totalPending = 0;
    let totalInProgress = 0;

    deptPerformanceData.forEach((d) => {
      totalUploaded += d.Uploaded;
      totalPending += d.Pending;
      totalInProgress += d['In Progress'];
    });

    const totalEntered = totalUploaded + totalPending + totalInProgress;

    return [
      { name: 'Uploaded (Complete)', value: totalUploaded, color: COLORS.uploaded },
      { name: 'In Progress', value: totalInProgress, color: COLORS.inProgress },
      { name: 'Pending (Delayed)', value: totalPending, color: COLORS.pending },
    ].filter((item) => item.value > 0 || totalEntered === 0);
  }, [deptPerformanceData]);

  // Semester-wise Trajectory (Semesters 1 to 8)
  const semesterTrajectoryData = useMemo(() => {
    return ['1', '2', '3', '4', '5', '6', '7', '8'].map((sem) => {
      let semUploaded = 0;
      let semPending = 0;
      let semTotal = 0;

      UNIVERSITY_DEPARTMENTS.forEach((dept) => {
        dept.programs.forEach((prog) => {
          const shifts: AcademicShift[] =
            selectedShiftFilter === 'ALL'
              ? ['Morning', 'Evening']
              : [selectedShiftFilter];

          shifts.forEach((sh) => {
            const sub = StorageService.getSubmission(
              dept.name,
              prog.name,
              prog.degreeLevel || 'BS',
              sh,
              currentSession,
              sem
            );
            if (sub && sub.subjects && sub.subjects.length > 0) {
              const summary = StorageService.calculateSummary(sub.subjects);
              semUploaded += summary.uploaded;
              semPending += summary.pending;
              semTotal += summary.totalSubjects;
            }
          });
        });
      });

      const completion = semTotal > 0 ? Math.round((semUploaded / semTotal) * 100) : 0;

      return {
        semester: `Sem ${sem}`,
        Uploaded: semUploaded,
        Pending: semPending,
        Total: semTotal,
        Completion: completion,
      };
    });
  }, [allRecords, currentSession, selectedShiftFilter]);

  // Delay reasons / bottleneck analysis
  const delayReasonsData = useMemo(() => {
    const reasonCounts: Record<string, number> = {};

    allRecords.forEach((rec) => {
      if (rec.session === currentSession && rec.subjects) {
        rec.subjects.forEach((subj) => {
          if (subj.status === 'Pending') {
            const reason = subj.remarks?.trim() || 'Awaiting Teacher Submission';
            const cleanReason =
              reason.length > 32 ? reason.substring(0, 30) + '…' : reason;
            reasonCounts[cleanReason] = (reasonCounts[cleanReason] || 0) + 1;
          }
        });
      }
    });

    const entries = Object.entries(reasonCounts).map(([reason, count]) => ({
      reason,
      count,
    }));

    entries.sort((a, b) => b.count - a.count);
    return entries.slice(0, 6);
  }, [allRecords, currentSession]);

  // Overall university KPI stats
  const aggregateKPIs = useMemo(() => {
    let totalUploaded = 0;
    let totalPending = 0;
    let totalInProgress = 0;
    let totalSubjects = 0;

    deptPerformanceData.forEach((d) => {
      totalUploaded += d.Uploaded;
      totalPending += d.Pending;
      totalInProgress += d['In Progress'];
      totalSubjects += d.Total;
    });

    const uploadPercentage =
      totalSubjects > 0 ? Math.round((totalUploaded / totalSubjects) * 100) : 0;

    const deptsWithData = deptPerformanceData.filter((d) => d.Total > 0);
    const topDept = [...deptsWithData].sort(
      (a, b) => b.Percentage - a.Percentage
    )[0];

    const lowestDept = [...deptsWithData].sort(
      (a, b) => a.Percentage - b.Percentage
    )[0];

    return {
      totalSubjects,
      totalUploaded,
      totalPending,
      totalInProgress,
      uploadPercentage,
      topDept,
      lowestDept,
    };
  }, [deptPerformanceData]);

  return (
    <div className="space-y-5">
      {/* Productivity View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setChartViewTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              chartViewTab === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Visualizations</span>
          </button>

          <button
            type="button"
            onClick={() => setChartViewTab('DEPTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              chartViewTab === 'DEPTS'
                ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Departmental Comparison</span>
          </button>

          <button
            type="button"
            onClick={() => setChartViewTab('SEMESTERS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              chartViewTab === 'SEMESTERS'
                ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Semester Trajectory (1-8)</span>
          </button>

          <button
            type="button"
            onClick={() => setChartViewTab('REASONS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              chartViewTab === 'REASONS'
                ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Delay Root Causes</span>
          </button>

          <button
            type="button"
            onClick={() => setChartViewTab('STATS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              chartViewTab === 'STATS'
                ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Statistical Metrics</span>
          </button>
        </div>

        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2 hidden sm:inline">
          Academic Session {currentSession} &bull; Live Institutional Stats
        </span>
      </div>

      {/* KPI Cards Row with Interactive Quick-Filters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => onFilterByStatus?.('ALL')}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs cursor-pointer hover:border-emerald-500 transition-all group"
          title="Click to view all courses"
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
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs cursor-pointer hover:border-emerald-500 transition-all group"
          title="Click to filter by submitted courses"
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
          <span className="text-[11px] text-slate-400 mt-2 block">
            Click to filter submitted rows
          </span>
        </div>

        <div
          onClick={() => onFilterByStatus?.('PENDING')}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs cursor-pointer hover:border-amber-500 transition-all group"
          title="Click to filter delayed courses"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pending Action
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {aggregateKPIs.totalPending}
            </span>
            <span className="text-xs text-slate-500 font-medium">courses delayed</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            {aggregateKPIs.totalInProgress} in progress &bull; Click to filter
          </span>
        </div>

        <div
          onClick={() => {
            if (aggregateKPIs.topDept) {
              onFilterByDepartment?.(aggregateKPIs.topDept.fullName);
            }
          }}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs cursor-pointer hover:border-indigo-500 transition-all group"
          title={aggregateKPIs.topDept ? `Click to inspect ${aggregateKPIs.topDept.fullName}` : ''}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Top Department
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 truncate">
              {aggregateKPIs.topDept ? `${aggregateKPIs.topDept.name} (${aggregateKPIs.topDept.Percentage}%)` : 'Pending Data'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            Highest completion &bull; Click to filter
          </span>
        </div>
      </div>

      {/* STATISTICAL VALUES & COMPARATIVE BENCHMARK ROW */}
      {(chartViewTab === 'ALL' || chartViewTab === 'STATS') && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Institutional Statistical Values &amp; Shift Compliance
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
              Computed Real-Time from Storage Engine
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-semibold">
                Morning Shift Completion
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                  {shiftComparison.morningRate}%
                </span>
                <span className="text-[10px] text-slate-500">
                  ({shiftComparison.morningUploaded}/{shiftComparison.morningTotal} courses)
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-semibold">
                Evening Shift Completion
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                  {shiftComparison.eveningRate}%
                </span>
                <span className="text-[10px] text-slate-500">
                  ({shiftComparison.eveningUploaded}/{shiftComparison.eveningTotal} courses)
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-semibold">
                Total Course Inventory
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                  {aggregateKPIs.totalSubjects}
                </span>
                <span className="text-[10px] text-slate-500">
                  active curriculum units
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-semibold">
                Attention Required
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-black text-amber-700 dark:text-amber-400 font-mono">
                  {aggregateKPIs.lowestDept ? `${aggregateKPIs.lowestDept.name}` : 'None'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {aggregateKPIs.lowestDept ? `(${aggregateKPIs.lowestDept.Percentage}% completed)` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary Analytics Section */}
      {(chartViewTab === 'ALL' || chartViewTab === 'DEPTS') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: Departmental Compliance Matrix (BarChart) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Departmental LMS Result Performance Comparison
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Uploaded vs. Pending vs. In Progress courses across all university departments
                </p>
              </div>
              <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-mono font-bold">
                Session {currentSession}
              </span>
            </div>

            <div className="h-[300px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={deptPerformanceData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '12px',
                      border: 'none',
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="Uploaded" stackId="a" fill={COLORS.uploaded} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="In Progress" stackId="a" fill={COLORS.inProgress} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Pending" stackId="a" fill={COLORS.pending} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: University Result Status Breakdown (Pie / Donut) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Status Distribution
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">Total: {aggregateKPIs.totalSubjects}</span>
            </div>

            <div className="h-[230px] w-full flex items-center justify-center">
              {aggregateKPIs.totalSubjects === 0 ? (
                <div className="text-center text-slate-400 text-xs py-10">
                  <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No course records submitted yet for this session.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        color: '#fff',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Custom Visual Legend */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-600 dark:text-slate-300">Uploaded</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">
                  {aggregateKPIs.totalUploaded} ({aggregateKPIs.uploadPercentage}%)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span className="text-slate-600 dark:text-slate-300">In Progress</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">
                  {aggregateKPIs.totalInProgress}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="text-slate-600 dark:text-slate-300">Pending</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">
                  {aggregateKPIs.totalPending}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Charts: Semester Trajectory & Delay Reasons */}
      {(chartViewTab === 'ALL' || chartViewTab === 'SEMESTERS' || chartViewTab === 'REASONS') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 3: Semester-wise Trajectory (Sem 1 to 8) */}
          {(chartViewTab === 'ALL' || chartViewTab === 'SEMESTERS') && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Semester-wise Upload Trajectory (Semesters 1 to 8)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">1st–8th Semesters</span>
              </div>

              <div className="h-[250px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={semesterTrajectoryData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorUploaded" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                    <XAxis dataKey="semester" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        color: '#fff',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                    <Area
                      type="monotone"
                      dataKey="Uploaded"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#colorUploaded)"
                    />
                    <Area
                      type="monotone"
                      dataKey="Pending"
                      stroke="#f59e0b"
                      fill="#fef3c7"
                      fillOpacity={0.4}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Chart 4: Root Cause / Delay Reasons Analysis */}
          {(chartViewTab === 'ALL' || chartViewTab === 'REASONS') && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Pending Result Root-Cause Bottlenecks
                  </h3>
                </div>
                <span className="text-[11px] bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold px-2 py-0.5 rounded">
                  Action Required
                </span>
              </div>

              <div className="pt-1">
                {delayReasonsData.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      Zero Pending Delay Reasons Logged
                    </p>
                    <p className="text-slate-400 mt-0.5">
                      All departments have either completed uploads or have no outstanding bottlenecks recorded.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {delayReasonsData.map((item, idx) => {
                      const maxCount = delayReasonsData[0].count || 1;
                      const barWidth = Math.round((item.count / maxCount) * 100);

                      return (
                        <div key={item.reason} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-700 dark:text-slate-200 truncate pr-2">
                              #{idx + 1}. {item.reason}
                            </span>
                            <span className="font-mono font-bold text-amber-700 dark:text-amber-400 shrink-0">
                              {item.count} course{item.count !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-amber-500 h-full rounded-full transition-all"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
