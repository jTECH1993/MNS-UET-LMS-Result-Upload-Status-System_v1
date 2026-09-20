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
  const [filterMode, setFilterMode] = useState<'ALL' | 'TRAILING' | 'COMPLETED'>('ALL');

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
      const isTrailing = uploadedPercentage < 50;

      return {
        deptName: dept.name,
        deptCode: dept.code,
        shortName: dept.code.replace('Dept. of ', '').replace('Engineering', 'Eng.'),
        uploadedCount: uploadedCoursesCount,
        pendingCount: pendingCoursesCount,
        totalCourses: totalRequiredCourses,
        uploadedPct: uploadedPercentage,
        pendingPct: pendingPercentage,
        isTrailing,
        isCompleted: uploadedPercentage === 100,
      };
    });
  }, [allRecords, currentSession, selectedSemesterFilter, selectedShiftFilter]);

  // Filtered stats for display
  const filteredStats = useMemo(() => {
    if (filterMode === 'TRAILING') return deptStats.filter((d) => d.isTrailing);
    if (filterMode === 'COMPLETED') return deptStats.filter((d) => d.isCompleted);
    return deptStats;
  }, [deptStats, filterMode]);

  const trailingDepts = useMemo(() => deptStats.filter((d) => d.isTrailing), [deptStats]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Departmental Submission Progress Widget
              {trailingDepts.length > 0 && (
                <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  {trailingDepts.length} Trailing (&lt;50%)
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Percentage of Uploaded vs. Pending LMS Results per Department (Recharts Visualization)
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All Depts ({deptStats.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('TRAILING')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              filterMode === 'TRAILING'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
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

      {/* Trailing Department Alert Box if any */}
      {trailingDepts.length > 0 && filterMode !== 'COMPLETED' && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-lg p-3 text-xs text-rose-900 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="font-bold shrink-0">Trailing Departments Alert:</span>
            <span className="truncate text-rose-800 dark:text-rose-300">
              {trailingDepts.map((d) => `${d.shortName} (${d.uploadedPct}% Uploaded)`).join(', ')}
            </span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 px-2 py-0.5 rounded shrink-0 self-start sm:self-auto">
            Action Recommended
          </span>
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
              dataKey="shortName"
              width={110}
              tick={{ fontSize: 11, fontWeight: 700, fill: '#334155' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs space-y-1.5 z-50">
                      <p className="font-bold text-amber-400 border-b border-slate-800 pb-1 flex items-center justify-between gap-3">
                        <span>{data.deptName}</span>
                        {data.isTrailing ? (
                          <span className="text-[9px] bg-rose-900 text-rose-200 px-1.5 py-0.2 rounded font-bold">
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
                        <span className="font-bold text-emerald-400">
                          {data.uploadedCount} ({data.uploadedPct}%)
                        </span>
                        <span className="text-amber-400 font-bold">Pending:</span>
                        <span className="font-bold text-amber-400">
                          {data.pendingCount} ({data.pendingPct}%)
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 italic pt-1 border-t border-slate-800">
                        Click row below to filter VC Dashboard to this department.
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
                  {value === 'uploadedPct' ? 'Uploaded Results (%)' : 'Pending Results (%)'}
                </span>
              )}
            />
            <Bar dataKey="uploadedPct" name="uploadedPct" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
            <Bar dataKey="pendingPct" name="pendingPct" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]}>
              {filteredStats.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isTrailing ? '#e11d48' : '#f59e0b'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Department Quick Filter List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        {filteredStats.map((d) => (
          <div
            key={d.deptName}
            onClick={() => onSelectDepartment?.(d.deptName)}
            className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 group ${
              d.isTrailing
                ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 hover:border-rose-500'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-emerald-500'
            }`}
            title={`Click to inspect details for ${d.deptName}`}
          >
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {d.shortName}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <span>{d.uploadedCount}/{d.totalCourses} uploaded</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <span
                className={`text-xs font-black px-2 py-0.5 rounded ${
                  d.isTrailing
                    ? 'bg-rose-100 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200'
                    : 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200'
                }`}
              >
                {d.uploadedPct}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
