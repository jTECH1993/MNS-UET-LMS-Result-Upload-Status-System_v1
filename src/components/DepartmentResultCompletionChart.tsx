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
} from 'lucide-react';

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
  activeSessionLabel: string;
  onSelectDepartment?: (deptName: string) => void;
  className?: string;
}

export const DepartmentResultCompletionChart: React.FC<Props> = ({
  departments,
  activeSessionLabel,
  onSelectDepartment,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'PERCENTAGE' | 'COURSES'>('PERCENTAGE');
  const [sortOption, setSortOption] = useState<'DEFAULT' | 'PERC_DESC' | 'PERC_ASC' | 'PENDING_DESC'>('PERC_DESC');
  const [hoveredDept, setHoveredDept] = useState<string | null>(null);

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

  // Process and sort chart data
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

  // Custom rich Tooltip for Recharts
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

          {/* Sort Dropdown */}
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
        </div>
      </div>

      {/* University Snapshot Stat Cards */}
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

      {/* Main Recharts Visual Display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs px-1 text-slate-500 dark:text-slate-400">
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
          <span className="text-[10px] font-mono italic hidden sm:inline">
            Side-by-side comparison across all {chartData.length} university faculties
          </span>
        </div>

        <div className="h-80 w-full bg-slate-50/60 dark:bg-slate-950/60 rounded-xl p-4 border border-slate-100 dark:border-slate-850">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'PERCENTAGE' ? (
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

      {/* Department Breakdown Mini-Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
        {chartData.map((d) => (
          <button
            key={d.name}
            type="button"
            onClick={() => onSelectDepartment?.(d.fullName)}
            className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 group-hover:text-emerald-500 transition-colors">
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
        ))}
      </div>
    </div>
  );
};
