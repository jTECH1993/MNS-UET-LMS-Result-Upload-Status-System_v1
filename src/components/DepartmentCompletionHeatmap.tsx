import React, { useState } from 'react';
import { DepartmentDimension } from '../services/vcAnalyticsService';
import { Building2, ChevronRight, AlertCircle, CheckCircle2, UserX, UserCheck, ArrowUpDown } from 'lucide-react';

interface Props {
  departments: DepartmentDimension[];
  onSelectDepartment: (dept: DepartmentDimension) => void;
}

export const DepartmentCompletionHeatmap: React.FC<Props> = ({
  departments,
  onSelectDepartment,
}) => {
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const sortedDepartments = [...departments].sort((a, b) => {
    if (sortOrder === 'desc') {
      return b.completionRate - a.completionRate;
    }
    return a.completionRate - b.completionRate;
  });

  const getBarColor = (pct: number) => {
    if (pct >= 90) return 'bg-emerald-600 dark:bg-emerald-500';
    if (pct >= 70) return 'bg-blue-600 dark:bg-blue-500';
    if (pct >= 50) return 'bg-amber-500 dark:bg-amber-400';
    return 'bg-rose-600 dark:bg-rose-500 font-bold';
  };

  const getBadgeColor = (pct: number) => {
    if (pct === 0) return 'text-white bg-rose-600 dark:bg-rose-600 border-rose-700 dark:border-rose-700 font-black animate-pulse shadow-2xs';
    if (pct >= 90) return 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    if (pct >= 70) return 'text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    if (pct >= 50) return 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    return 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Department Completion Ranking & Heatmap
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Click any department to inspect HOD, assigned coordinators, multi-section cohorts, and course-level audit
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Toggle sort order"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortOrder === 'desc' ? 'Highest First' : 'Attention First'}</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {sortedDepartments.map((dept) => {
          return (
            <div
              key={dept.code}
              onClick={() => onSelectDepartment(dept)}
              className="p-3 rounded-lg border border-slate-150 dark:border-slate-800 hover:border-emerald-500/80 dark:hover:border-emerald-500 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {dept.code}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {dept.name}
                  </span>
                  <span className="text-[11px] text-slate-400 hidden md:inline">
                    ({dept.programsCount} {dept.programsCount === 1 ? 'Program' : 'Programs'})
                  </span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {/* HOD Status Pill (Notice: Dept exists even if HOD is not registered) */}
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      dept.hod.isRegistered
                        ? 'text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        : 'text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {dept.hod.isRegistered ? (
                      <>
                        <UserCheck className="w-3 h-3 text-emerald-600" />
                        <span className="hidden sm:inline">HOD:</span> {dept.hod.name.split(' ')[0]}
                      </>
                    ) : (
                      <>
                        <UserX className="w-3 h-3 text-amber-500" />
                        HOD Not Registered
                      </>
                    )}
                  </span>

                  {/* Percentage Badge */}
                  <span
                    className={`text-xs font-black px-2.5 py-0.5 rounded-md border min-w-[54px] text-center ${getBadgeColor(
                      dept.completionRate
                    )}`}
                  >
                    {dept.completionRate}%
                  </span>

                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden flex">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getBarColor(
                    dept.completionRate
                  )}`}
                  style={{ width: `${Math.max(dept.completionRate, 2)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                <span>
                  {dept.uploadedCourses} of {dept.totalCourses} courses uploaded
                </span>
                {dept.pendingCourses > 0 ? (
                  <span className="text-rose-600 dark:text-rose-400 font-medium">
                    {dept.pendingCourses} pending
                  </span>
                ) : dept.totalCourses > 0 && dept.uploadedCourses === dept.totalCourses ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> All uploaded
                  </span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 font-medium">
                    Pending setup
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
