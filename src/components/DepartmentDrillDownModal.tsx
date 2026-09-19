import React, { useState } from 'react';
import { DepartmentDimension, ProgramDimension } from '../services/vcAnalyticsService';
import {
  X,
  Building2,
  UserCheck,
  UserX,
  BookOpen,
  ChevronRight,
  ShieldAlert,
  GraduationCap,
  Calendar,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  department: DepartmentDimension | null;
  onSelectProgram: (prog: ProgramDimension) => void;
}

export const DepartmentDrillDownModal: React.FC<Props> = ({
  isOpen,
  onClose,
  department,
  onSelectProgram,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<'ALL' | 'Morning' | 'Evening'>('ALL');

  if (!isOpen || !department) return null;

  const filteredPrograms = department.programs.filter((p) => {
    const matchesSearch =
      p.program.toLowerCase().includes(filterQuery.toLowerCase()) ||
      p.coordinator.name.toLowerCase().includes(filterQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedShiftFilter === 'ALL') return true;
    const coordShifts = p.coordinator.shifts || ['Morning', 'Evening'];
    return coordShifts.includes(selectedShiftFilter);
  });

  const getStatusBadge = (status: ProgramDimension['status']) => {
    switch (status) {
      case 'Verified':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Verified
          </span>
        );
      case 'Partial':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3 text-blue-600" />
            Partial
          </span>
        );
      case 'Overdue':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 px-2 py-0.5 rounded-full animate-pulse">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Overdue
          </span>
        );
      case 'Attention Required':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-2 py-0.5 rounded-full">
            <ShieldAlert className="w-3 h-3 text-amber-600" />
            Attention Required
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded-full">
            Not Started
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 via-emerald-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <Building2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-emerald-200 border border-white/20">
                  {department.code}
                </span>
                <h2 className="text-base sm:text-lg font-black tracking-tight">{department.name}</h2>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Executive Academic Hierarchy &amp; Program Cohort Drill-Down
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Department Overview Banner (HOD, Programs, Overall Completion) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs">
          {/* HOD Dimension (Separated from department existence) */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60 shadow-2xs">
            <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1">
              HEAD OF DEPARTMENT (HOD)
            </span>
            <div className="flex items-center gap-2">
              {department.hod.isRegistered ? (
                <>
                  <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                      {department.hod.name}
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Active Registered Account
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
                    <UserX className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-amber-700 dark:text-amber-400 text-sm">
                      Not Registered
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Leadership profile pending registration
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Programs Count */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60 shadow-2xs">
            <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1">
              ACADEMIC DEGREE PROGRAMS
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {department.programsCount}
              </span>
              <span className="text-slate-500">
                Programs ({department.totalCourses} total curricular courses)
              </span>
            </div>
          </div>

          {/* Overall Department Completion */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60 shadow-2xs">
            <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1">
              OVERALL COMPLETION RATE
            </span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {department.completionRate}%
              </span>
              <span className="text-[11px] text-slate-500">
                {department.uploadedCourses} / {department.totalCourses} uploaded
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  department.completionRate >= 90
                    ? 'bg-emerald-600'
                    : department.completionRate >= 70
                    ? 'bg-blue-600'
                    : department.completionRate >= 50
                    ? 'bg-amber-500'
                    : 'bg-rose-600'
                }`}
                style={{ width: `${Math.max(department.completionRate, 2)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Search & Shift Filter Bar */}
        <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Search programs or coordinators..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full sm:w-72 px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {/* Shift Filter buttons */}
            <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedShiftFilter('ALL')}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  selectedShiftFilter === 'ALL'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Shifts
              </button>
              <button
                type="button"
                onClick={() => setSelectedShiftFilter('Morning')}
                className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  selectedShiftFilter === 'Morning'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sun className="w-2.5 h-2.5" />
                <span>Morning</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedShiftFilter('Evening')}
                className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  selectedShiftFilter === 'Evening'
                    ? 'bg-indigo-700 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Moon className="w-2.5 h-2.5" />
                <span>Evening</span>
              </button>
            </div>
          </div>
          <span className="text-xs text-slate-500 shrink-0">
            Showing {filteredPrograms.length} of {department.programs.length} programs
          </span>
        </div>

        {/* Programs Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">Program</th>
                  <th className="p-3 text-center">Academic Shift</th>
                  <th className="p-3">Coordinator Dimension</th>
                  <th className="p-3 text-center">Sections</th>
                  <th className="p-3 text-center">Courses</th>
                  <th className="p-3">Completion</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPrograms.map((prog) => {
                  const coordShifts = (prog as any).supportedShifts || prog.coordinator?.shifts || ['Morning'];
                  const isMorning = coordShifts.includes('Morning');
                  const isEvening = coordShifts.includes('Evening');

                  return (
                    <tr
                      key={prog.program}
                      onClick={() => onSelectProgram(prog)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    >
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">
                        <div className="font-bold text-sm group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                          {prog.program}
                        </div>
                        <div className="text-[11px] text-slate-400">{prog.degreeLevel}</div>
                      </td>

                      {/* Academic Shift Column */}
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          {isMorning && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <Sun className="w-2.5 h-2.5 text-amber-600" />
                              <span>Morning</span>
                            </span>
                          )}
                          {isEvening && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              <Moon className="w-2.5 h-2.5 text-indigo-600" />
                              <span>Evening</span>
                            </span>
                          )}
                          {!isMorning && !isEvening && (
                            <span className="text-[10px] text-slate-400 font-medium">Standard</span>
                          )}
                        </div>
                      </td>

                      {/* Coordinator Dimension */}
                      <td className="p-3">
                        {prog.coordinator.isAssigned ? (
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                              <span>{prog.coordinator.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {prog.coordinator.shiftLabel && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80">
                                  {prog.coordinator.shiftLabel}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500">
                                Account: Active
                                {prog.coordinator.lastLoginAt && (
                                  <span className="ml-1.5">
                                    • {new Date(prog.coordinator.lastLoginAt).toLocaleDateString()}
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-amber-700 dark:text-amber-400">
                            <div className="font-bold flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                              — Not Assigned
                            </div>
                            <div className="text-[10px] text-slate-500">Account Not Created</div>
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {prog.sectionsCount}
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {prog.totalCourses}
                      </td>

                      <td className="p-3 min-w-[140px]">
                        <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                          <span>{prog.completionRate}%</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {prog.uploadedCourses}/{prog.totalCourses}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              prog.completionRate === 100
                                ? 'bg-emerald-600'
                                : prog.completionRate > 0
                                ? 'bg-blue-600'
                                : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                            style={{ width: `${Math.max(prog.completionRate, 2)}%` }}
                          />
                        </div>
                      </td>

                      <td className="p-3 text-center">{getStatusBadge(prog.status)}</td>

                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProgram(prog);
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Click any program row to inspect multi-section course results</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
