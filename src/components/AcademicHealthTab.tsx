import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import { SubmissionRecord, AcademicShift } from '../types';
import { VCAnalyticsService } from '../services/vcAnalyticsService';
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Download,
  Filter,
  BarChart3,
  TrendingUp,
  Percent,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  GraduationCap
} from 'lucide-react';

interface Props {
  allRecords: SubmissionRecord[];
  activeSessions: string[];
  selectedSemesterFilter: string | string[];
  selectedShiftFilter: 'ALL' | AcademicShift;
  onSelectDepartment: (deptName: string) => void;
}

export const AcademicHealthTab: React.FC<Props> = ({
  allRecords,
  activeSessions,
  selectedSemesterFilter,
  selectedShiftFilter,
  onSelectDepartment,
}) => {
  const [chartMode, setChartMode] = useState<'COUNT' | 'PERCENTAGE'>('COUNT');
  const [shiftFilter, setShiftFilter] = useState<'ALL' | AcademicShift>(selectedShiftFilter);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Compute analytics using VCAnalyticsService
  const analytics = useMemo(() => {
    return VCAnalyticsService.buildAcademicHierarchy({
      allRecords,
      currentSession: activeSessions,
      semesterFilter: selectedSemesterFilter,
      shiftFilter,
    });
  }, [allRecords, activeSessions, selectedSemesterFilter, shiftFilter]);

  // Transform departments into stacked bar chart data
  const deptHealthData = useMemo(() => {
    return UNIVERSITY_DEPARTMENTS.map((d) => {
      const deptDimension = analytics.departments.find(
        (dim) => dim.name.toLowerCase().trim() === d.name.toLowerCase().trim()
      );

      let totalCourses = 0;
      let completedCourses = 0;
      let inProgressCourses = 0;
      let pendingCourses = 0;

      if (deptDimension) {
        totalCourses = deptDimension.totalCourses;
        completedCourses = deptDimension.uploadedCourses;
        pendingCourses = deptDimension.pendingCourses;

        // Calculate in-progress from programs/sections or derived
        deptDimension.programs.forEach((p) => {
          p.sections.forEach((s) => {
            s.courses.forEach((c) => {
              if (c.status === 'In Progress') {
                inProgressCourses++;
              }
            });
          });
        });

        // Ensure pending doesn't double-count inProgress if separated
        if (inProgressCourses > 0 && pendingCourses >= inProgressCourses) {
          pendingCourses = pendingCourses - inProgressCourses;
        }
      }

      // Fallback default calculation if no subjects exist yet
      if (totalCourses === 0) {
        totalCourses = d.programs.length * 4; // Estimate 4 courses per program
        pendingCourses = totalCourses;
      }

      const completedPct = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;
      const inProgressPct = totalCourses > 0 ? Math.round((inProgressCourses / totalCourses) * 100) : 0;
      const pendingPct = totalCourses > 0 ? Math.max(0, 100 - completedPct - inProgressPct) : 100;

      // Determine Health Status
      let healthStatus: 'Completed' | 'Healthy' | 'Needs Attention' | 'Critical' = 'Healthy';
      if (completedPct === 100) {
        healthStatus = 'Completed';
      } else if (completedPct >= 65) {
        healthStatus = 'Healthy';
      } else if (completedPct >= 35) {
        healthStatus = 'Needs Attention';
      } else {
        healthStatus = 'Critical';
      }

      return {
        department: d.name,
        deptCode: d.code,
        shortName: d.code,
        programsCount: d.programs.length,
        total: totalCourses,
        Completed: completedCourses,
        InProgress: inProgressCourses,
        Pending: pendingCourses,
        CompletedPct: completedPct,
        InProgressPct: inProgressPct,
        PendingPct: pendingPct,
        healthStatus,
        hodName: deptDimension?.hod.name || 'HOD Appointed',
        isHodRegistered: deptDimension?.hod.isRegistered ?? true,
      };
    });
  }, [analytics]);

  // Filtered department health items
  const filteredDeptData = useMemo(() => {
    if (!searchQuery.trim()) return deptHealthData;
    const q = searchQuery.toLowerCase().trim();
    return deptHealthData.filter(
      (d) =>
        d.department.toLowerCase().includes(q) ||
        d.deptCode.toLowerCase().includes(q) ||
        d.hodName.toLowerCase().includes(q)
    );
  }, [deptHealthData, searchQuery]);

  // Aggregate totals
  const aggregateMetrics = useMemo(() => {
    const totalCourses = deptHealthData.reduce((acc, d) => acc + d.total, 0);
    const totalCompleted = deptHealthData.reduce((acc, d) => acc + d.Completed, 0);
    const totalInProgress = deptHealthData.reduce((acc, d) => acc + d.InProgress, 0);
    const totalPending = deptHealthData.reduce((acc, d) => acc + d.Pending, 0);

    const overallPct = totalCourses > 0 ? Math.round((totalCompleted / totalCourses) * 100) : 0;

    // Top and Lowest Performing Depts
    const sorted = [...deptHealthData].sort((a, b) => b.CompletedPct - a.CompletedPct);
    const topDept = sorted[0];
    const lowestDept = sorted[sorted.length - 1];

    return {
      totalCourses,
      totalCompleted,
      totalInProgress,
      totalPending,
      overallPct,
      topDept,
      lowestDept,
    };
  }, [deptHealthData]);

  // CSV Exporter for Academic Health Breakdown
  const handleExportCSV = () => {
    const headers = [
      'Department Code',
      'Department Name',
      'Health Status',
      'Total Courses',
      'Completed (Uploaded)',
      'In Progress',
      'Pending Upload',
      'Completion %',
    ];

    const rows = deptHealthData.map((d) => [
      d.deptCode,
      `"${d.department.replace(/"/g, '""')}"`,
      d.healthStatus,
      d.total,
      d.Completed,
      d.InProgress,
      d.Pending,
      `${d.CompletedPct}%`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MNS_UET_Academic_Health_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Recharts Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-lg border border-slate-700 shadow-xl text-xs space-y-2 max-w-xs">
          <div className="border-b border-slate-700 pb-2">
            <p className="font-extrabold text-emerald-400 text-sm">{data.deptCode} - {data.department}</p>
            <p className="text-[10px] text-slate-300">{data.programsCount} Degree Programs • {data.total} Total Courses</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-emerald-300 font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Completed:
              </span>
              <span>{data.Completed} ({data.CompletedPct}%)</span>
            </div>

            <div className="flex items-center justify-between text-blue-300 font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                In Progress:
              </span>
              <span>{data.InProgress} ({data.InProgressPct}%)</span>
            </div>

            <div className="flex items-center justify-between text-amber-300 font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                Pending:
              </span>
              <span>{data.Pending} ({data.PendingPct}%)</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span>HOD: {data.hodName}</span>
            <span className="text-emerald-400 font-bold">Click to inspect →</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="academic-health-tab" className="space-y-6">
      {/* Tab Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 rounded-xl border border-slate-800 shadow-lg text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 shrink-0">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                Institutional Health Index
              </span>
              <span className="text-xs font-semibold text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
                Active Sessions: {activeSessions.join(', ')}
              </span>
            </div>
            <h2 className="text-lg font-black tracking-tight uppercase text-white">
              Academic Health &amp; Result Upload Completeness Dashboard
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl">
              Visualizes result upload progress across all 8 university departments using a stacked distribution matrix of <strong className="text-emerald-400">Completed</strong>, <strong className="text-blue-400">In Progress</strong>, and <strong className="text-amber-400">Pending</strong> course status logs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download departmental academic health matrix as CSV"
          >
            <Download className="w-4 h-4" />
            <span>Export Health CSV</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: University Health Index */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Overall Health Index
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  aggregateMetrics.overallPct >= 75
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : aggregateMetrics.overallPct >= 50
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {aggregateMetrics.overallPct >= 75 ? 'Optimal' : aggregateMetrics.overallPct >= 50 ? 'Moderate' : 'Critical'}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-slate-900 font-mono">
                {aggregateMetrics.overallPct}%
              </span>
              <span className="text-xs font-bold text-slate-500">
                ({aggregateMetrics.totalCompleted} / {aggregateMetrics.totalCourses} Courses)
              </span>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
              <div className="bg-emerald-500 h-full" style={{ width: `${aggregateMetrics.overallPct}%` }} />
              <div
                className="bg-blue-500 h-full"
                style={{
                  width: `${
                    aggregateMetrics.totalCourses > 0
                      ? (aggregateMetrics.totalInProgress / aggregateMetrics.totalCourses) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Across all 8 departments &amp; active cohorts
            </p>
          </div>
        </div>

        {/* Card 2: Completed Courses */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Completed Uploads
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                Verified
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-emerald-700 font-mono">
                {aggregateMetrics.totalCompleted}
              </span>
              <span className="text-xs font-bold text-emerald-600">
                Courses (100% Uploaded)
              </span>
            </div>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-3">
            Final grade sheets submitted &amp; verified into LMS
          </p>
        </div>

        {/* Card 3: In Progress Courses */}
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                In Progress Courses
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300">
                Active Drafts
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-blue-700 font-mono">
                {aggregateMetrics.totalInProgress}
              </span>
              <span className="text-xs font-bold text-blue-600">
                Partial Submissions
              </span>
            </div>
          </div>
          <p className="text-[11px] text-blue-700 font-medium mt-3">
            HOD / Instructors currently drafting result rosters
          </p>
        </div>

        {/* Card 4: Pending Uploads */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Pending Uploads
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                Action Due
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-amber-800 font-mono">
                {aggregateMetrics.totalPending}
              </span>
              <span className="text-xs font-bold text-amber-700">
                Awaiting Upload
              </span>
            </div>
          </div>
          <p className="text-[11px] text-amber-800 font-medium mt-3">
            Pending course result entries required for VC signoff
          </p>
        </div>
      </div>

      {/* Main Stacked Bar Chart Section */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>Departmental Result Upload Distribution Matrix</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Stacked breakdown of course statuses across all 8 departments. Click any department bar to view its roster.
            </p>
          </div>

          {/* Controls: Chart Mode Toggle & Shift Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Shift Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              {(['ALL', 'Morning', 'Evening'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setShiftFilter(s)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    shiftFilter === s
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s === 'ALL' ? 'All Shifts' : s}
                </button>
              ))}
            </div>

            {/* Count vs Percentage Mode */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setChartMode('COUNT')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  chartMode === 'COUNT'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Course Count
              </button>
              <button
                type="button"
                onClick={() => setChartMode('PERCENTAGE')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  chartMode === 'PERCENTAGE'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                100% Normalized
              </button>
            </div>
          </div>
        </div>

        {/* Recharts Stacked Bar Chart */}
        <div className="w-full h-[420px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={deptHealthData}
              margin={{ top: 20, right: 30, left: 10, bottom: 65 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  const deptName = e.activePayload[0].payload.department;
                  if (deptName) onSelectDepartment(deptName);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="deptCode"
                angle={-25}
                textAnchor="end"
                interval={0}
                height={70}
                tick={{ fontSize: 11, fontWeight: 'bold', fill: '#334155' }}
              />
              <YAxis
                domain={chartMode === 'PERCENTAGE' ? [0, 100] : [0, 'auto']}
                unit={chartMode === 'PERCENTAGE' ? '%' : ''}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 15, fontSize: '11px', fontWeight: 'bold' }}
              />

              {/* Stacked Bars */}
              <Bar
                dataKey={chartMode === 'COUNT' ? 'Completed' : 'CompletedPct'}
                name="Completed (Uploaded)"
                stackId="a"
                fill="#10b981"
                radius={chartMode === 'COUNT' ? [0, 0, 0, 0] : [0, 0, 0, 0]}
              />
              <Bar
                dataKey={chartMode === 'COUNT' ? 'InProgress' : 'InProgressPct'}
                name="In Progress"
                stackId="a"
                fill="#3b82f6"
              />
              <Bar
                dataKey={chartMode === 'COUNT' ? 'Pending' : 'PendingPct'}
                name="Pending Upload"
                stackId="a"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="text-[11px] text-slate-500 italic text-center pt-2 border-t border-slate-100">
          💡 Click on any department bar above to inspect its granular program roster, course codes, and teacher entries.
        </p>
      </div>

      {/* Department Health Cards Grid */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Departmental Academic Health Roster</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Granular health breakdown for each of the 8 university academic departments.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search department or HOD..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredDeptData.map((d) => {
            const statusBadgeClasses = {
              Completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
              Healthy: 'bg-teal-100 text-teal-800 border-teal-300',
              'Needs Attention': 'bg-amber-100 text-amber-800 border-amber-300',
              Critical: 'bg-rose-100 text-rose-800 border-rose-300',
            };

            return (
              <div
                key={d.deptCode}
                className="bg-slate-50/80 hover:bg-slate-50 p-4 rounded-xl border border-slate-200 transition-all flex flex-col justify-between space-y-3 group hover:border-indigo-400 hover:shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{d.deptCode}</span>
                      <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors line-clamp-1">
                        {d.department}
                      </h4>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${statusBadgeClasses[d.healthStatus]}`}>
                      {d.healthStatus}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Completion Progress</span>
                      <span className="text-emerald-700">{d.CompletedPct}%</span>
                    </div>

                    {/* Stacked Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                      <div className="bg-emerald-500 h-full" style={{ width: `${d.CompletedPct}%` }} />
                      <div className="bg-blue-500 h-full" style={{ width: `${d.InProgressPct}%` }} />
                      <div className="bg-amber-500 h-full" style={{ width: `${d.PendingPct}%` }} />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-1">
                      <span className="text-emerald-700 font-bold">{d.Completed} Completed</span>
                      <span className="text-blue-700 font-bold">{d.InProgress} In Progress</span>
                      <span className="text-amber-700 font-bold">{d.Pending} Pending</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                  <div className="text-[10px] text-slate-500">
                    <span className="block font-semibold text-slate-700 line-clamp-1">HOD: {d.hodName}</span>
                    <span>{d.programsCount} Programs</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectDepartment(d.department)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-900 hover:text-white text-slate-700 text-[11px] font-bold rounded border border-slate-300 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <span>View Roster</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
