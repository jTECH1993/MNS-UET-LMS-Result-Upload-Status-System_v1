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
  Cell,
} from 'recharts';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  ChevronRight,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import { StorageService } from '../services/storageService';
import { SubmissionRecord, AcademicShift } from '../types';

interface DepartmentSubmissionSummaryWidgetProps {
  allRecords: SubmissionRecord[];
  currentSession: string;
  activeSessions?: string[];
  selectedSemesterFilter: string;
  selectedShiftFilter: 'ALL' | AcademicShift;
  onSelectDepartment?: (deptName: string) => void;
}

export const DepartmentSubmissionSummaryWidget: React.FC<DepartmentSubmissionSummaryWidgetProps> = ({
  allRecords,
  currentSession,
  activeSessions = ['2023'],
  selectedSemesterFilter,
  selectedShiftFilter,
  onSelectDepartment,
}) => {
  const [filterMode, setFilterMode] = useState<'ALL' | 'ZERO' | 'TRAILING' | 'COMPLETED'>('ALL');

  // Compute per-department upload vs pending stats
  const deptStats = useMemo(() => {
    const globalShifts = StorageService.getGlobalActiveShifts();

    return UNIVERSITY_DEPARTMENTS.map((dept) => {
      let totalRequiredCourses = 0;
      let uploadedCoursesCount = 0;

      // Filter programs to session active programs
      const sessionPrograms = StorageService.getSessionPrograms(dept.name, currentSession);
      const activePrograms = dept.programs.filter((p) => sessionPrograms.includes(p.name));
      const targetPrograms = activePrograms.length > 0 ? activePrograms : dept.programs;

      targetPrograms.forEach((prog) => {
        // Active shifts for this program
        const progShifts = StorageService.getProgramShifts(dept.name, prog.name).filter((s) =>
          globalShifts.includes(s)
        );

        if (selectedShiftFilter !== 'ALL' && !progShifts.includes(selectedShiftFilter)) {
          return;
        }

        const activeShiftsToCount =
          selectedShiftFilter !== 'ALL' ? [selectedShiftFilter] : progShifts;

        activeShiftsToCount.forEach((shift) => {
          // Semesters to count
          const semestersToCount =
            selectedSemesterFilter === 'ALL'
              ? ['1', '2', '3', '4', '5', '6', '7', '8']
              : [selectedSemesterFilter];

          semestersToCount.forEach((sem) => {
            // Estimate default required courses per semester (typically 5-6 courses per sem)
            const record = StorageService.getSubmission(
              dept.name,
              prog.name,
              prog.degreeLevel,
              shift,
              currentSession,
              sem
            );

            let semCoursesCount = 5; // default expected
            if (record && record.subjects && record.subjects.length > 0) {
              semCoursesCount = record.subjects.length;
              const uploadedInRec = record.subjects.filter(
                (s) => (s.status || '').trim().toLowerCase() === 'uploaded'
              ).length;
              uploadedCoursesCount += uploadedInRec;
            } else {
              // Check if in allRecords
              const matches = allRecords.filter(
                (r) =>
                  r &&
                  StorageService._isDeptMatch(dept.name, r.department) &&
                  StorageService._isProgMatch(prog.name, r.program) &&
                  (r.shift || 'Morning').trim().toLowerCase() === shift.toLowerCase() &&
                  (r.semester || '1').trim() === sem.trim()
              );
              if (matches.length > 0) {
                let recUploaded = 0;
                matches.forEach((m) => {
                  if (m.subjects) {
                    semCoursesCount = Math.max(semCoursesCount, m.subjects.length);
                    recUploaded += m.subjects.filter(
                      (s) => (s.status || '').trim().toLowerCase() === 'uploaded'
                    ).length;
                  }
                });
                uploadedCoursesCount += recUploaded;
              }
            }

            totalRequiredCourses += semCoursesCount;
          });
        });
      });

      const pendingCoursesCount = Math.max(0, totalRequiredCourses - uploadedCoursesCount);
      const uploadedPercentage =
        totalRequiredCourses > 0
          ? Math.min(100, Math.round((uploadedCoursesCount / totalRequiredCourses) * 100))
          : 0;
      const pendingPercentage = 100 - uploadedPercentage;
      const isZeroPercent = uploadedPercentage === 0 || uploadedCoursesCount === 0;
      const isTrailing = uploadedPercentage < 50;

      const fullDisplayName = `${dept.name} (${dept.code})`;
      const rawShortName = dept.code.replace('Dept. of ', '').replace('Engineering', 'Eng.');
      const shortName = isZeroPercent ? `⚠️ ${rawShortName}` : rawShortName;
      const chartLabel = isZeroPercent
        ? `⚠️ ${dept.name.replace('Department of ', '')} (${dept.code})`
        : `${dept.name.replace('Department of ', '')} (${dept.code})`;

      return {
        deptName: dept.name,
        deptCode: dept.code,
        fullDisplayName,
        chartLabel,
        shortName,
        rawShortName,
        uploadedCount: uploadedCoursesCount,
        pendingCount: pendingCoursesCount,
        totalCourses: totalRequiredCourses,
        uploadedPct: uploadedPercentage,
        pendingPct: pendingPercentage,
        isZeroPercent,
        isTrailing,
        isCompleted: uploadedPercentage === 100,
      };
    });
  }, [allRecords, currentSession, selectedSemesterFilter, selectedShiftFilter]);

  // Filtered stats for display
  const filteredStats = useMemo(() => {
    if (filterMode === 'ZERO') return deptStats.filter((d) => d.isZeroPercent);
    if (filterMode === 'TRAILING') return deptStats.filter((d) => d.isTrailing);
    if (filterMode === 'COMPLETED') return deptStats.filter((d) => d.isCompleted);
    return deptStats;
  }, [deptStats, filterMode]);

  const zeroPercentDepts = useMemo(() => deptStats.filter((d) => d.isZeroPercent), [deptStats]);
  const trailingDepts = useMemo(() => deptStats.filter((d) => d.isTrailing && !d.isZeroPercent), [deptStats]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
              Departmental Submission Progress Widget
              {zeroPercentDepts.length > 0 && (
                <span className="text-[10px] font-black bg-rose-600 text-white border border-rose-700 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse shadow-2xs">
                  <AlertTriangle className="w-3 h-3 text-white" />
                  {zeroPercentDepts.length} Depts with 0% Submissions!
                </span>
              )}
              {trailingDepts.length > 0 && (
                <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-amber-600" />
                  {trailingDepts.length} Trailing (&lt;50%)
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Percentage of Uploaded vs. Pending LMS Results per Department (Departments with 0% progress highlighted in Red)
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All ({deptStats.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('ZERO')}
            className={`px-2.5 py-1 rounded text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
              filterMode === 'ZERO'
                ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-400'
                : 'text-rose-700 dark:text-rose-400 font-extrabold hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            0% Missing ({zeroPercentDepts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('TRAILING')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              filterMode === 'TRAILING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            <TrendingDown className="w-3 h-3" />
            Trailing ({trailingDepts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('COMPLETED')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              filterMode === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            100% Uploaded
          </button>
        </div>
      </div>

      {/* Critical Alert Box for Departments with 0% Upload Progress */}
      {zeroPercentDepts.length > 0 && filterMode !== 'COMPLETED' && (
        <div className="bg-rose-100/90 dark:bg-rose-950/80 border-2 border-rose-500 rounded-xl p-3.5 text-xs text-rose-950 dark:text-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-pulse">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-rose-600 text-white shrink-0">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-black text-rose-950 dark:text-rose-100 uppercase tracking-wide flex items-center gap-2">
                <span>Critical Attention Required: 0% Upload Progress</span>
                <span className="text-[10px] font-mono font-black bg-rose-700 text-white px-2 py-0.2 rounded">
                  0 RESULTS IN LMS
                </span>
              </p>
              <p className="text-[11px] font-bold text-rose-900 dark:text-rose-200 mt-0.5 truncate">
                Missing Submissions in: {zeroPercentDepts.map((d) => d.fullDisplayName).join(' • ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFilterMode('ZERO')}
            className="text-[10px] font-black uppercase tracking-wider bg-rose-700 hover:bg-rose-800 text-white px-3 py-1.5 rounded-lg shrink-0 self-start sm:self-auto cursor-pointer transition-colors shadow-2xs"
          >
            Isolate 0% Depts →
          </button>
        </div>
      )}

      {/* Recharts Visual Progress Bar Chart */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={filteredStats}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            barCategoryGap={12}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <YAxis
              type="category"
              dataKey="chartLabel"
              width={195}
              tick={({ x, y, payload }) => {
                const isZero = payload.value.includes('⚠️');
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={-5}
                      y={3}
                      textAnchor="end"
                      fill={isZero ? '#dc2626' : '#334155'}
                      fontSize={10.5}
                      fontWeight={isZero ? 900 : 600}
                    >
                      {payload.value}
                    </text>
                  </g>
                );
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs space-y-1.5 z-50">
                      <p className="font-bold text-amber-400 border-b border-slate-800 pb-1 flex items-center justify-between gap-3">
                        <span>{data.fullDisplayName}</span>
                        {data.isZeroPercent ? (
                          <span className="text-[9px] bg-rose-600 text-white px-2 py-0.5 rounded font-black animate-pulse">
                            🚨 0% MISSING SUBMISSIONS
                          </span>
                        ) : data.isTrailing ? (
                          <span className="text-[9px] bg-amber-900 text-amber-200 px-1.5 py-0.2 rounded font-bold">
                            Trailing (&lt;50%)
                          </span>
                        ) : (
                          <span className="text-[9px] bg-emerald-900 text-emerald-200 px-1.5 py-0.2 rounded font-bold">
                            On Track
                          </span>
                        )}
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                        <span className="text-slate-400">Total Courses:</span>
                        <span className="font-bold text-slate-200">{data.totalCourses}</span>
                        <span className="text-emerald-400 font-bold">Uploaded:</span>
                        <span className={`font-bold ${data.isZeroPercent ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {data.uploadedCount} ({data.uploadedPct}%)
                        </span>
                        <span className="text-amber-400 font-bold">Pending:</span>
                        <span className={`font-bold ${data.isZeroPercent ? 'text-rose-400 font-black' : 'text-amber-400'}`}>
                          {data.pendingCount} ({data.pendingPct}%)
                        </span>
                      </div>
                      {data.isZeroPercent && (
                        <p className="text-[10px] text-rose-300 font-bold bg-rose-950/80 p-1.5 rounded border border-rose-800 mt-1">
                          ⚠️ Zero results uploaded for this department yet!
                        </p>
                      )}
                      <p className="text-[9px] text-slate-400 italic pt-1 border-t border-slate-800">
                        Click card below to filter VC Dashboard to this department.
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              formatter={(value) => (
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {value === 'uploadedPct' ? 'Uploaded Results (%)' : 'Pending Results / Missing (%)'}
                </span>
              )}
            />
            <Bar dataKey="uploadedPct" name="uploadedPct" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
            <Bar dataKey="pendingPct" name="pendingPct" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]}>
              {filteredStats.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.isZeroPercent
                      ? '#dc2626' // Highlight 0% upload progress in BOLD RED
                      : entry.isTrailing
                      ? '#f59e0b'
                      : '#f59e0b'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Department Quick Filter List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
        {filteredStats.map((d) => (
          <div
            key={d.deptName}
            onClick={() => onSelectDepartment?.(d.deptName)}
            className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
              d.isZeroPercent
                ? 'bg-rose-100/90 dark:bg-rose-950/80 border-2 border-rose-500 shadow-xs hover:border-rose-600'
                : d.isTrailing
                ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 hover:border-amber-500'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-emerald-500'
            }`}
            title={`Click to inspect details for ${d.fullDisplayName}`}
          >
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-bold transition-colors flex items-center gap-1.5 ${
                d.isZeroPercent
                  ? 'text-rose-950 dark:text-rose-100 font-black'
                  : 'text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
              }`}>
                {d.isZeroPercent && <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                <span className="truncate block" title={d.fullDisplayName}>{d.fullDisplayName}</span>
              </p>
              <p className={`text-[10px] flex items-center gap-1 mt-0.5 ${
                d.isZeroPercent ? 'text-rose-800 dark:text-rose-300 font-bold' : 'text-slate-500 dark:text-slate-400'
              }`}>
                <span>{d.uploadedCount}/{d.totalCourses} uploaded</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <span
                className={`text-xs font-black px-2 py-0.5 rounded whitespace-nowrap ${
                  d.isZeroPercent
                    ? 'bg-rose-600 text-white animate-pulse'
                    : d.isTrailing
                    ? 'bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200'
                    : 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200'
                }`}
              >
                {d.uploadedPct}% {d.isZeroPercent && 'MISSING'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
