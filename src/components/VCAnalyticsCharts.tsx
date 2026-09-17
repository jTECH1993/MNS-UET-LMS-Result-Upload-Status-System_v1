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
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  ZAxis,
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
  Split,
  Scale,
  Users,
  ArrowRight,
  ExternalLink,
  Check,
  Activity,
  Map,
} from 'lucide-react';

interface Props {
  allRecords: SubmissionRecord[];
  currentSession: string;
  activeSessions?: string[];
  selectedSemesterFilter?: string;
  selectedShiftFilter?: 'ALL' | AcademicShift;
  selectedSectionFilter?: string;
  onFilterByDepartment?: (deptName: string) => void;
  onFilterByStatus?: (status: 'ALL' | 'SUBMITTED' | 'PENDING') => void;
  onFilterBySection?: (section: string) => void;
  onInspectProgram?: (
    department: string,
    program: string,
    shift: AcademicShift,
    session: string,
    semester: string,
    section: string
  ) => void;
}

const COLORS = {
  uploaded: '#10b981', // emerald-500
  inProgress: '#3b82f6', // blue-500
  pending: '#f59e0b', // amber-500
  awaiting: '#94a3b8', // slate-400
  secA: '#059669', // emerald-600
  secB: '#6366f1', // indigo-500
  secC: '#ec4899', // pink-500
  secD: '#8b5cf6', // purple-500
};

export const VCAnalyticsCharts: React.FC<Props> = ({
  allRecords,
  currentSession,
  activeSessions,
  selectedSemesterFilter = 'ALL',
  selectedShiftFilter = 'ALL',
  selectedSectionFilter = 'ALL',
  onFilterByDepartment,
  onFilterByStatus,
  onFilterBySection,
  onInspectProgram,
}) => {
  const effectiveSessions = useMemo(() => {
    if (activeSessions && activeSessions.length > 0) return activeSessions;
    return [currentSession || '2023'];
  }, [activeSessions, currentSession]);

  const [chartViewTab, setChartViewTab] = useState<
    'ALL' | 'DEPTS' | 'SECTIONS' | 'SEMESTERS' | 'REASONS' | 'STATS' | 'HEATMAP' | 'TIMELINE'
  >('ALL');

  // Compute departmental performance stats, respecting active section filter if specified
  const deptPerformanceData = useMemo(() => {
    return UNIVERSITY_DEPARTMENTS.map((dept) => {
      let uploaded = 0;
      let pending = 0;
      let inProgress = 0;
      let total = 0;

      // Filter all matching records in database across active sessions
      const matching = allRecords.filter((r) => {
        if (r.department.trim() !== dept.name.trim()) return false;
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
          const summary = StorageService.calculateSummary(r.subjects);
          uploaded += summary.uploaded;
          pending += summary.pending;
          inProgress += summary.inProgress;
          total += summary.totalSubjects;
        }
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
  }, [allRecords, effectiveSessions, selectedSemesterFilter, selectedShiftFilter, selectedSectionFilter]);

  const globalPercentage = useMemo(() => {
    const total = deptPerformanceData.reduce((acc, curr) => acc + curr.Total, 0);
    const uploaded = deptPerformanceData.reduce((acc, curr) => acc + curr.Uploaded, 0);
    return total > 0 ? Math.round((uploaded / total) * 100) : 0;
  }, [deptPerformanceData]);

  // Shift Comparison: Morning vs Evening
  const shiftComparison = useMemo(() => {
    let morningUploaded = 0;
    let morningTotal = 0;
    let eveningUploaded = 0;
    let eveningTotal = 0;

    allRecords.forEach((r) => {
      if (effectiveSessions.includes(r.session || '2023') && r.subjects) {
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
  }, [allRecords, effectiveSessions]);

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
            effectiveSessions.forEach((sess) => {
              const sub = StorageService.getSubmission(
                dept.name,
                prog.name,
                prog.degreeLevel || 'BS',
                sh,
                sess,
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
  }, [allRecords, effectiveSessions, selectedShiftFilter]);

  // Delay reasons / bottleneck analysis
  const delayReasonsData = useMemo(() => {
    const reasonCounts: Record<string, number> = {};

    allRecords.forEach((rec) => {
      if (effectiveSessions.includes(rec.session || '2023') && rec.subjects) {
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
  }, [allRecords, effectiveSessions]);

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

  // Section Analytics Data & Cross-Cohort Comparisons
  const activeSections = useMemo(() => {
    const set = new Set<string>(['A', 'B']);
    allRecords.forEach((r) => {
      if (effectiveSessions.includes(r.session || '2023') && r.section) {
        set.add(r.section.trim().toUpperCase());
      }
    });
    return Array.from(set).sort();
  }, [allRecords, effectiveSessions]);

  const sectionMetrics = useMemo(() => {
    return activeSections.map((sec) => {
      let uploaded = 0;
      let pending = 0;
      let inProgress = 0;
      let total = 0;
      const progSet = new Set<string>();

      allRecords.forEach((r) => {
        if (!effectiveSessions.includes(r.session || '2023')) return;
        if (selectedShiftFilter !== 'ALL' && (r.shift || 'Morning') !== selectedShiftFilter) return;
        if (selectedSemesterFilter !== 'ALL' && (r.semester || '1') !== selectedSemesterFilter) return;

        const rSec = (r.section || 'A').trim().toUpperCase();
        if (rSec !== sec) return;

        if (r.subjects && r.subjects.length > 0) {
          const sum = StorageService.calculateSummary(r.subjects);
          uploaded += sum.uploaded;
          pending += sum.pending;
          inProgress += sum.inProgress;
          total += sum.totalSubjects;
          progSet.add(`${r.department}__${r.program}`);
        }
      });

      const completionRate = total > 0 ? Math.round((uploaded / total) * 100) : 0;

      return {
        section: sec,
        name: `Section ${sec}`,
        uploaded,
        pending,
        inProgress,
        total,
        completionRate,
        programsCount: progSet.size,
      };
    });
  }, [allRecords, effectiveSessions, selectedShiftFilter, selectedSemesterFilter, activeSections]);

  const secAStats = useMemo(() => {
    return (
      sectionMetrics.find((s) => s.section === 'A') || {
        section: 'A',
        name: 'Section A',
        uploaded: 0,
        pending: 0,
        inProgress: 0,
        total: 0,
        completionRate: 0,
        programsCount: 0,
      }
    );
  }, [sectionMetrics]);

  const secBStats = useMemo(() => {
    return (
      sectionMetrics.find((s) => s.section === 'B') || {
        section: 'B',
        name: 'Section B',
        uploaded: 0,
        pending: 0,
        inProgress: 0,
        total: 0,
        completionRate: 0,
        programsCount: 0,
      }
    );
  }, [sectionMetrics]);

  // Parity Index between Section A and Section B
  const sectionParity = useMemo(() => {
    const gap = Math.abs(secAStats.completionRate - secBStats.completionRate);
    const parityIndex = Math.max(0, 100 - gap);
    return {
      gap,
      parityIndex,
      isBalanced: gap <= 10,
    };
  }, [secAStats, secBStats]);

  // Section Metric Comparison Data for Grouped Bar Chart
  const sectionMetricComparisonData = useMemo(() => {
    return [
      {
        metric: 'Verified Uploaded',
        'Section A': secAStats.uploaded,
        'Section B': secBStats.uploaded,
      },
      {
        metric: 'In Progress',
        'Section A': secAStats.inProgress,
        'Section B': secBStats.inProgress,
      },
      {
        metric: 'Pending Delay',
        'Section A': secAStats.pending,
        'Section B': secBStats.pending,
      },
      {
        metric: 'Total Courses',
        'Section A': secAStats.total,
        'Section B': secBStats.total,
      },
    ];
  }, [secAStats, secBStats]);

  // Departmental Section Disparity (Section A % vs Section B % per department)
  const deptSectionComparisonData = useMemo(() => {
    return UNIVERSITY_DEPARTMENTS.map((dept) => {
      let aUploaded = 0;
      let aTotal = 0;
      let bUploaded = 0;
      let bTotal = 0;

      allRecords.forEach((r) => {
        if (r.department.trim() !== dept.name.trim()) return;
        if (!effectiveSessions.includes(r.session || '2023')) return;
        if (selectedShiftFilter !== 'ALL' && (r.shift || 'Morning') !== selectedShiftFilter) return;
        if (selectedSemesterFilter !== 'ALL' && (r.semester || '1') !== selectedSemesterFilter) return;

        const sec = (r.section || 'A').trim().toUpperCase();
        const sum = StorageService.calculateSummary(r.subjects || []);
        if (sec === 'A') {
          aUploaded += sum.uploaded;
          aTotal += sum.totalSubjects;
        } else if (sec === 'B') {
          bUploaded += sum.uploaded;
          bTotal += sum.totalSubjects;
        }
      });

      const aRate = aTotal > 0 ? Math.round((aUploaded / aTotal) * 100) : 0;
      const bRate = bTotal > 0 ? Math.round((bUploaded / bTotal) * 100) : 0;
      const disparity = Math.abs(aRate - bRate);

      return {
        code: dept.code,
        name: dept.name,
        'Section A': aRate,
        'Section B': bRate,
        aUploaded,
        aTotal,
        bUploaded,
        bTotal,
        disparity,
        hasDisparity: (aTotal > 0 || bTotal > 0) && disparity >= 20,
      };
    });
  }, [allRecords, effectiveSessions, selectedShiftFilter, selectedSemesterFilter]);

  // Semester Trajectory by Section (Semesters 1 through 8)
  const semesterSectionTrajectoryData = useMemo(() => {
    return ['1', '2', '3', '4', '5', '6', '7', '8'].map((sem) => {
      let aUploaded = 0;
      let aTotal = 0;
      let bUploaded = 0;
      let bTotal = 0;

      allRecords.forEach((r) => {
        if (!effectiveSessions.includes(r.session || '2023')) return;
        if (selectedShiftFilter !== 'ALL' && (r.shift || 'Morning') !== selectedShiftFilter) return;
        if ((r.semester || '1') !== sem) return;

        const sec = (r.section || 'A').trim().toUpperCase();
        const sum = StorageService.calculateSummary(r.subjects || []);
        if (sec === 'A') {
          aUploaded += sum.uploaded;
          aTotal += sum.totalSubjects;
        } else if (sec === 'B') {
          bUploaded += sum.uploaded;
          bTotal += sum.totalSubjects;
        }
      });

      const aRate = aTotal > 0 ? Math.round((aUploaded / aTotal) * 100) : 0;
      const bRate = bTotal > 0 ? Math.round((bUploaded / bTotal) * 100) : 0;

      return {
        semester: `Sem ${sem}`,
        'Section A': aRate,
        'Section B': bRate,
        'Section A (Count)': aUploaded,
        'Section B (Count)': bUploaded,
      };
    });
  }, [allRecords, effectiveSessions, selectedShiftFilter]);

  // Cohort Section Disparity Actionable Alert List
  const sectionDisparityAlerts = useMemo(() => {
    const alerts: Array<{
      department: string;
      program: string;
      shift: AcademicShift;
      semester: string;
      secAUploaded: number;
      secATotal: number;
      secARate: number;
      secBUploaded: number;
      secBTotal: number;
      secBRate: number;
      disparity: number;
      message: string;
    }> = [];

    const cohortGroups: Record<string, { secA?: SubmissionRecord; secB?: SubmissionRecord }> = {};

    allRecords.forEach((r) => {
      if (!effectiveSessions.includes(r.session || '2023')) return;
      if (selectedShiftFilter !== 'ALL' && (r.shift || 'Morning') !== selectedShiftFilter) return;
      if (selectedSemesterFilter !== 'ALL' && (r.semester || '1') !== selectedSemesterFilter) return;

      const key = `${r.department.trim()}__${r.program.trim()}__${r.shift || 'Morning'}__${r.semester || '1'}`;
      if (!cohortGroups[key]) cohortGroups[key] = {};
      const sec = (r.section || 'A').trim().toUpperCase();
      if (sec === 'A') cohortGroups[key].secA = r;
      else if (sec === 'B') cohortGroups[key].secB = r;
    });

    Object.entries(cohortGroups).forEach(([key, group]) => {
      if (!group.secA && !group.secB) return;
      const [department, program, shift, semester] = key.split('__');

      const sumA = group.secA
        ? StorageService.calculateSummary(group.secA.subjects || [])
        : { uploaded: 0, totalSubjects: 0 };
      const sumB = group.secB
        ? StorageService.calculateSummary(group.secB.subjects || [])
        : { uploaded: 0, totalSubjects: 0 };

      const rateA = sumA.totalSubjects > 0 ? Math.round((sumA.uploaded / sumA.totalSubjects) * 100) : 0;
      const rateB = sumB.totalSubjects > 0 ? Math.round((sumB.uploaded / sumB.totalSubjects) * 100) : 0;

      const disparity = Math.abs(rateA - rateB);

      if ((sumA.totalSubjects > 0 || sumB.totalSubjects > 0) && (disparity >= 15 || (rateA > 0 && !group.secB) || (rateB > 0 && !group.secA))) {
        alerts.push({
          department,
          program,
          shift: shift as AcademicShift,
          semester,
          secAUploaded: sumA.uploaded,
          secATotal: sumA.totalSubjects,
          secARate: rateA,
          secBUploaded: sumB.uploaded,
          secBTotal: sumB.totalSubjects,
          secBRate: rateB,
          disparity,
          message:
            rateA >= rateB
              ? `Section A is at ${rateA}% while Section B is at ${rateB}%`
              : `Section B is at ${rateB}% while Section A is at ${rateA}%`,
        });
      }
    });

    return alerts.sort((a, b) => b.disparity - a.disparity);
  }, [allRecords, effectiveSessions, selectedShiftFilter, selectedSemesterFilter]);

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
            onClick={() => setChartViewTab('SECTIONS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              chartViewTab === 'SECTIONS'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>Section-Wise Graphs (Sec A vs B)</span>
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

          <button
            type="button"
            onClick={() => setChartViewTab('HEATMAP')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              chartViewTab === 'HEATMAP'
                ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Heatmap Grid</span>
          </button>

          <button
            type="button"
            onClick={() => setChartViewTab('TIMELINE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              chartViewTab === 'TIMELINE'
                ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Timeline</span>
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

      {/* SECTION-WISE GRAPHS & COHORT DISPARITY INTELLIGENCE */}
      {(chartViewTab === 'ALL' || chartViewTab === 'SECTIONS') && (
        <div className="space-y-4">
          {/* Section Header with Parity Index & Quick Filter */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <Split className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Section-Wise LMS Result Intelligence &amp; Parity Analysis
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Direct cohort comparison of Section A vs. Section B upload velocity, completion parity, and department-level divergence
                </p>
              </div>

              {/* Section Quick-Filter Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Filter View:</span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => onFilterBySection?.('ALL')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      selectedSectionFilter === 'ALL'
                        ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    All Sections
                  </button>
                  <button
                    type="button"
                    onClick={() => onFilterBySection?.('A')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      selectedSectionFilter === 'A'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Section A Only
                  </button>
                  <button
                    type="button"
                    onClick={() => onFilterBySection?.('B')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      selectedSectionFilter === 'B'
                        ? 'bg-indigo-700 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Section B Only
                  </button>
                </div>
              </div>
            </div>

            {/* Section Executive KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-4">
              {/* Section A Card */}
              <div
                onClick={() => onFilterBySection?.('A')}
                className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 cursor-pointer hover:border-emerald-400 transition-all"
                title="Click to filter by Section A"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                    Section A Compliance
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    Cohort A
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                    {secAStats.completionRate}%
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    ({secAStats.uploaded}/{secAStats.total} courses)
                  </span>
                </div>
                <div className="w-full bg-emerald-100 dark:bg-emerald-950 rounded-full h-1.5 mt-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all"
                    style={{ width: `${secAStats.completionRate}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-2 block">
                  {secAStats.pending} pending &bull; {secAStats.inProgress} in progress
                </span>
              </div>

              {/* Section B Card */}
              <div
                onClick={() => onFilterBySection?.('B')}
                className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 cursor-pointer hover:border-indigo-400 transition-all"
                title="Click to filter by Section B"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
                    Section B Compliance
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                    Cohort B
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-indigo-700 dark:text-indigo-400 font-mono">
                    {secBStats.completionRate}%
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    ({secBStats.uploaded}/{secBStats.total} courses)
                  </span>
                </div>
                <div className="w-full bg-indigo-100 dark:bg-indigo-950 rounded-full h-1.5 mt-2.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all"
                    style={{ width: `${secBStats.completionRate}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-2 block">
                  {secBStats.pending} pending &bull; {secBStats.inProgress} in progress
                </span>
              </div>

              {/* Section Parity Index */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Cohort Parity Index
                  </span>
                  <Scale className="w-4 h-4 text-slate-500" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    {sectionParity.parityIndex}%
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      sectionParity.isBalanced ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {sectionParity.isBalanced ? 'High Parity' : `${sectionParity.gap}% Gap`}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      sectionParity.isBalanced ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${sectionParity.parityIndex}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-2 block">
                  University-wide section upload synchronization
                </span>
              </div>

              {/* Disparity Alerts */}
              <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                    Divergence Alerts
                  </span>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-amber-700 dark:text-amber-400 font-mono">
                    {sectionDisparityAlerts.length}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">cohort(s)</span>
                </div>
                <span className="text-[10px] text-amber-800 dark:text-amber-400 mt-3 block">
                  Cohorts with &gt;15% gap between Sec A and Sec B
                </span>
              </div>
            </div>
          </div>

          {/* Section Graphs Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Section A vs Section B Course Load & Status (Grouped Bar Chart) */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Section A vs. Section B Status Comparison
                  </h4>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600"></span> Sec A
                  </span>
                  <span className="flex items-center gap-1 text-indigo-700 dark:text-indigo-400">
                    <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500"></span> Sec B
                  </span>
                </div>
              </div>

              <div className="h-[280px] w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sectionMetricComparisonData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                    <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
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
                    <Bar dataKey="Section A" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Section B" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Departmental Section Disparity (Sec A % vs Sec B %) */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Departmental Section Completion Parity (%)
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Target: 100% Both Cohorts
                </span>
              </div>

              <div className="h-[280px] w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={deptSectionComparisonData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                    <XAxis dataKey="code" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip
                      formatter={(value: any) => [`${value}%`, '']}
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
                    <Bar dataKey="Section A" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Section B" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Semester x Section Trajectory (Semesters 1-8) */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Semester-Wise Section Trajectory (Sem 1 to 8)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Completion Rate %</span>
              </div>

              <div className="h-[260px] w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={semesterSectionTrajectoryData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                    <XAxis dataKey="semester" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip
                      formatter={(value: any) => [`${value}%`, '']}
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        color: '#fff',
                        borderRadius: '8px',
                        fontSize: '12px',
                        border: 'none',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line
                      type="monotone"
                      dataKey="Section A"
                      stroke="#059669"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Section B"
                      stroke="#6366f1"
                      strokeWidth={3}
                      strokeDasharray="4 4"
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Actionable Disparity Watchlist for Vice Chancellor */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Section Cohort Divergence Watchlist
                    </h4>
                  </div>
                  <span className="text-[11px] bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-bold px-2 py-0.5 rounded">
                    {sectionDisparityAlerts.length} Attention Item{sectionDisparityAlerts.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-2.5 mt-3 max-h-[260px] overflow-y-auto pr-1">
                  {sectionDisparityAlerts.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="font-bold text-slate-700 dark:text-slate-300">
                        Excellent Cohort Synchronization!
                      </p>
                      <p className="text-slate-400 mt-0.5">
                        No major upload discrepancies detected between Section A and Section B.
                      </p>
                    </div>
                  ) : (
                    sectionDisparityAlerts.map((item, idx) => (
                      <div
                        key={`${item.department}_${item.program}_${item.shift}_${item.semester}_${idx}`}
                        className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {item.program}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 font-semibold text-slate-700 dark:text-slate-300">
                              {item.shift} &bull; Sem {item.semester}
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                            {item.message}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500">
                            <span>Sec A: <strong className="text-emerald-700">{item.secAUploaded}/{item.secATotal}</strong></span>
                            <span>Sec B: <strong className="text-indigo-700">{item.secBUploaded}/{item.secBTotal}</strong></span>
                            <span>Gap: <strong className="text-amber-700">{item.disparity}%</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              onInspectProgram?.(
                                item.department,
                                item.program,
                                item.shift,
                                currentSession,
                                item.semester,
                                'A'
                              )
                            }
                            className="px-2 py-1 rounded bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200 font-bold text-[11px] cursor-pointer"
                            title="Inspect Section A"
                          >
                            Sec A
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onInspectProgram?.(
                                item.department,
                                item.program,
                                item.shift,
                                currentSession,
                                item.semester,
                                'B'
                              )
                            }
                            className="px-2 py-1 rounded bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 hover:bg-indigo-200 font-bold text-[11px] cursor-pointer"
                            title="Inspect Section B"
                          >
                            Sec B
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Direct HOD verification available per cohort</span>
                <span className="font-mono font-bold text-slate-500">Session {currentSession}</span>
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

      {/* HEATMAP TAB */}
      {(chartViewTab === 'HEATMAP' || chartViewTab === 'ALL') && (
        <div className="grid grid-cols-1 gap-4 mt-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Map className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Institutional Completion Heatmap
                </h3>
              </div>
              <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full dark:bg-indigo-900/50 dark:text-indigo-300">
                Density Overview
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-[150px_repeat(8,1fr)] gap-1 mb-2">
                  <div className="text-xs font-bold text-slate-500">Department</div>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                    <div key={sem} className="text-xs font-bold text-slate-500 text-center">Sem {sem}</div>
                  ))}
                </div>
                {UNIVERSITY_DEPARTMENTS.map(dept => (
                  <div key={dept.name} className="grid grid-cols-[150px_repeat(8,1fr)] gap-1 mb-1 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1 rounded transition-colors">
                    <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate pr-2" title={dept.name}>
                      {dept.name.substring(0, 22)}...
                    </div>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
                      // Calculate completion % for this dept and semester across all records
                      const semRecords = allRecords.filter(r => r.department === dept.name && r.semester === String(sem));
                      const totalSubjects = semRecords.reduce((acc, curr) => acc + (curr.subjects.length || 0), 0);
                      const notApplicable = semRecords.reduce((acc, curr) => acc + ((curr.subjects.filter(s => s.status === 'Not Applicable').length) || 0), 0);
                      const baseScore = Math.max(0, totalSubjects - notApplicable);
                      const uploaded = semRecords.reduce((acc, curr) => acc + ((curr.subjects.filter(s => s.status === 'Uploaded').length) || 0), 0);
                      
                      let pct = 0;
                      if (baseScore > 0) {
                        pct = Math.round((uploaded / baseScore) * 100);
                      }
                      
                      let bgColor = 'bg-slate-100 dark:bg-slate-800'; // No data / 0%
                      let textColor = 'text-transparent';
                      
                      if (baseScore > 0) {
                        textColor = 'text-white dark:text-white';
                        if (pct >= 100) bgColor = 'bg-emerald-500';
                        else if (pct >= 80) bgColor = 'bg-emerald-400';
                        else if (pct >= 50) bgColor = 'bg-amber-400';
                        else if (pct >= 25) bgColor = 'bg-orange-400';
                        else if (pct > 0) bgColor = 'bg-rose-400';
                        else bgColor = 'bg-rose-500';
                      }

                      return (
                        <div 
                          key={sem} 
                          className={`h-8 rounded flex items-center justify-center text-[10px] font-bold transition-all hover:scale-105 cursor-crosshair ${bgColor} ${textColor}`}
                          title={`${dept.name} - Sem ${sem}: ${pct}% Uploaded`}
                        >
                          {baseScore > 0 ? `${pct}%` : '-'}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TIMELINE TAB */}
      {(chartViewTab === 'TIMELINE' || chartViewTab === 'ALL') && (
        <div className="grid grid-cols-1 gap-4 mt-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  University Progress Trajectory
                </h3>
              </div>
              <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full dark:bg-blue-900/50 dark:text-blue-300">
                Simulated Trajectory
              </span>
            </div>
            
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { day: 'Day 1', progress: 5 },
                  { day: 'Day 2', progress: 12 },
                  { day: 'Day 3', progress: 28 },
                  { day: 'Day 4', progress: 45 },
                  { day: 'Day 5', progress: 62 },
                  { day: 'Day 6', progress: Math.min(100, Math.max(70, globalPercentage - 5)) },
                  { day: 'Today', progress: globalPercentage }
                ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                    formatter={(value: any) => [`${value}%`, 'Completion']}
                  />
                  <Area type="monotone" dataKey="progress" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorProgress)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
