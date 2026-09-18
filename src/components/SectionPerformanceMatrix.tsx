import React from 'react';
import { DepartmentDimension, ProgramDimension, SectionBreakdown } from '../services/vcAnalyticsService';
import { Layers, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface Props {
  departments: DepartmentDimension[];
  onSelectProgramSection: (program: ProgramDimension, section: SectionBreakdown) => void;
}

export const SectionPerformanceMatrix: React.FC<Props> = ({
  departments,
  onSelectProgramSection,
}) => {
  // Collect top programs across departments to show in matrix
  const matrixRows: {
    deptCode: string;
    deptName: string;
    hodName: string;
    isHodRegistered: boolean;
    program: ProgramDimension;
    coordName: string;
    isCoordAssigned: boolean;
    shiftLabel: string;
    sections: { [secName: string]: SectionBreakdown | undefined };
  }[] = [];

  departments.forEach((dept) => {
    dept.programs.slice(0, 4).forEach((prog) => {
      const secMap: { [secName: string]: SectionBreakdown } = {};
      prog.sections.forEach((sec) => {
        secMap[sec.section] = sec;
      });
      matrixRows.push({
        deptCode: dept.code,
        deptName: dept.name,
        hodName: dept.hod.isRegistered ? dept.hod.name : 'Account Not Created',
        isHodRegistered: dept.hod.isRegistered,
        program: prog,
        coordName: prog.coordinator.isAssigned ? prog.coordinator.name : 'Account Not Created',
        isCoordAssigned: prog.coordinator.isAssigned,
        shiftLabel: prog.coordinator.shiftLabel || 'Morning & Evening',
        sections: secMap,
      });
    });
  });

  const getCellBadge = (sec?: SectionBreakdown) => {
    if (!sec) {
      return (
        <span
          title="Single Section Cohort (Only Section A is active)"
          className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 text-[11px] font-medium border border-slate-200 dark:border-slate-700/60 select-none"
        >
          —
        </span>
      );
    }
    const rate = sec.completionRate;
    if (rate === 100) {
      return (
        <div className="inline-flex flex-col items-center justify-center gap-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-1 rounded text-[11px] font-bold border border-emerald-300 dark:border-emerald-800 min-w-[80px]">
          <span className="flex items-center gap-1">100% <span>🟢</span></span>
          <span className="text-[9px] font-medium text-emerald-700 dark:text-emerald-400">Complete ({sec.uploadedCourses}/{sec.totalCourses})</span>
        </div>
      );
    }
    if (rate > 0) {
      return (
        <div className="inline-flex flex-col items-center justify-center gap-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 px-2 py-1 rounded text-[11px] font-bold border border-amber-300 dark:border-amber-800 min-w-[80px]">
          <span className="flex items-center gap-1">{rate}% <span>🟡</span></span>
          <span className="text-[9px] font-medium text-amber-700 dark:text-amber-400">Pending {sec.pendingCourses}/{sec.totalCourses}</span>
        </div>
      );
    }
    return (
      <div className="inline-flex flex-col items-center justify-center gap-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 px-2 py-1 rounded text-[11px] font-bold border border-rose-300 dark:border-rose-800 min-w-[80px]">
        <span className="flex items-center gap-1">0% <span>🔴</span></span>
        <span className="text-[9px] font-medium text-rose-700 dark:text-rose-400">Pending {sec.pendingCourses}/{sec.totalCourses}</span>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Section Performance Matrix (Cohort Heatmap)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pinpoints exact section-level lags (Section A vs Section B) across academic programs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1">🟢 100% Verified</span>
          <span className="flex items-center gap-1">🟡 Partial</span>
          <span className="flex items-center gap-1">🔴 0% Pending</span>
          <span className="flex items-center gap-1 text-slate-400"><span>—</span> Single Section</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <th className="p-2.5">Department & HOD</th>
              <th className="p-2.5">Degree Program & Shift</th>
              <th className="p-2.5">Program Coordinator</th>
              <th className="p-2.5 text-center w-28">Section A</th>
              <th className="p-2.5 text-center w-28">Section B</th>
              <th className="p-2.5 text-center w-24">Overall</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {matrixRows.slice(0, 12).map((row) => (
              <tr
                key={`${row.deptCode}-${row.program.program}`}
                className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                <td className="p-2.5">
                  <div className="font-bold text-slate-900 dark:text-white" title={row.deptName}>
                    {row.deptName}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    Code: {row.deptCode}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">HOD:</span>
                    {row.isHodRegistered ? (
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {row.hodName}
                      </span>
                    ) : (
                      <span className="font-semibold text-amber-600 dark:text-amber-400 italic">
                        Account Not Created
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-2.5">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {row.program.program}
                  </div>
                  <div className="mt-1">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {row.shiftLabel} Shift
                    </span>
                  </div>
                </td>
                <td className="p-2.5">
                  {row.isCoordAssigned ? (
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        {row.coordName}
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ Active Account
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-rose-600 dark:text-rose-400 font-bold text-xs italic">
                        Account Not Created
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">
                        No Coordinator Assigned
                      </div>
                    </div>
                  )}
                </td>
                <td
                  className="p-2 text-center cursor-pointer hover:opacity-80"
                  onClick={() => {
                    const sec = row.sections['A'];
                    if (sec) onSelectProgramSection(row.program, sec);
                  }}
                >
                  {getCellBadge(row.sections['A'])}
                </td>
                <td
                  className="p-2 text-center cursor-pointer hover:opacity-80"
                  onClick={() => {
                    const sec = row.sections['B'];
                    if (sec) onSelectProgramSection(row.program, sec);
                  }}
                >
                  {getCellBadge(row.sections['B'])}
                </td>
                <td className="p-2.5 text-center font-bold text-slate-900 dark:text-white">
                  {row.program.completionRate}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
