import React, { useState } from 'react';
import {
  BottleneckInfo,
  RadarUnit,
  RadarDrillPath,
} from '../services/completionRadarService';
import {
  AlertTriangle,
  Flame,
  Clock,
  UserCheck,
  UserX,
  Target,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface Props {
  bottleneck: BottleneckInfo;
  activeInspectorUnit: RadarUnit | null;
  onJumpToBottleneck: (bottleneck: BottleneckInfo) => void;
  onSelectUnitFromAction?: (drillPath: RadarDrillPath) => void;
  runnerUps?: BottleneckInfo[];
}

export const BottleneckActionPanel: React.FC<Props> = ({
  bottleneck,
  activeInspectorUnit,
  onJumpToBottleneck,
  onSelectUnitFromAction,
  runnerUps = [],
}) => {
  const allBottlenecks = [bottleneck, ...runnerUps];
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentItem = allBottlenecks[currentIndex] || bottleneck;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? allBottlenecks.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === allBottlenecks.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="space-y-4">
      {/* =========================================================================
         SIGNATURE CARD: 🚨 CURRENT BOTTLENECK (CAROUSEL NAVIGATION)
         ========================================================================= */}
      <div className="bg-gradient-to-br from-rose-950/80 via-slate-900 to-slate-900 rounded-2xl border-2 border-rose-500/60 shadow-xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header Ribbon with Carousel Controls */}
        <div className="bg-rose-900/50 border-b border-rose-800/60 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
            </span>
            <span className="text-xs font-black tracking-wider uppercase text-rose-200 flex items-center gap-1.5">
              <span>🚨 CURRENT BOTTLENECK ({currentIndex + 1} of {allBottlenecks.length})</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-mono">
              Risk Score: {currentItem.riskScore}
            </span>

            {allBottlenecks.length > 1 && (
              <div className="flex items-center gap-1 bg-rose-950/90 border border-rose-800 rounded px-1.5 py-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="text-rose-200 hover:text-white p-1 cursor-pointer transition-colors"
                  title="Previous Program Bottleneck"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono font-bold text-rose-100 px-1">
                  {currentIndex + 1} / {allBottlenecks.length}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  className="text-rose-200 hover:text-white p-1 cursor-pointer transition-colors"
                  title="Next Program Bottleneck"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Department Status Live Banner */}
        <div className="bg-rose-950/60 border-b border-rose-900/40 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate pr-2">
            <span className="px-2 py-0.5 rounded bg-rose-900/80 text-rose-200 font-bold text-[10px] uppercase tracking-wider">
              Department Status
            </span>
            <span className="font-bold text-white truncate" title={currentItem.department}>
              {currentItem.department}
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold text-amber-300 shrink-0">
            {currentItem.pendingCourses} Pending
          </span>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 text-white">
          <div className="space-y-2.5 text-xs">
            {/* Department */}
            <div className="flex items-baseline justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 font-medium">Department:</span>
              <span className="font-bold text-slate-100 text-right truncate max-w-[210px]" title={currentItem.department}>
                {currentItem.department.replace('Department of ', '')}
              </span>
            </div>

            {/* Program */}
            <div className="flex items-baseline justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 font-medium">Program:</span>
              <span className="font-bold text-rose-300 text-right truncate max-w-[210px]" title={currentItem.program}>
                {currentItem.program}
              </span>
            </div>

            {/* Semester & Section */}
            <div className="grid grid-cols-2 gap-2 border-b border-slate-800/80 pb-2">
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Semester:</span>
                <span className="font-bold text-slate-200">{currentItem.semesterLabel}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 font-medium block text-[11px]">Active Section:</span>
                <span className="font-bold text-amber-300">{currentItem.section}</span>
              </div>
            </div>

            {/* Section Upload Status */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 font-medium">Upload Status:</span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  currentItem.pendingCourses === 0
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : currentItem.submittedCourses > 0
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : 'bg-rose-950 text-rose-300 border-rose-800'
                }`}
              >
                {currentItem.pendingCourses === 0
                  ? `✓ Complete (${currentItem.submittedCourses}/${currentItem.totalCourses})`
                  : currentItem.submittedCourses > 0
                  ? `🟡 Partial (${currentItem.submittedCourses}/${currentItem.totalCourses})`
                  : `🔴 Pending (${currentItem.pendingCourses}/${currentItem.totalCourses})`}
              </span>
            </div>

            {/* Submitted vs Pending Workload */}
            <div className="grid grid-cols-2 gap-2 border-b border-slate-800/80 pb-2">
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Submitted:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {currentItem.submittedCourses} / {currentItem.totalCourses} courses
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 font-medium block text-[11px]">Pending:</span>
                <span className="font-black text-rose-400 font-mono">
                  {currentItem.pendingCourses} / {currentItem.totalCourses} courses
                </span>
              </div>
            </div>

            {/* Coordinator */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 font-medium">Coordinator:</span>
              <span
                className={`font-semibold flex items-center gap-1 ${
                  currentItem.coordinatorStatus === 'Assigned' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {currentItem.coordinatorStatus === 'Assigned' ? (
                  <UserCheck className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <UserX className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="truncate max-w-[170px]" title={currentItem.coordinatorName}>{currentItem.coordinatorName}</span>
              </span>
            </div>

            {/* HOD */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 font-medium">HOD:</span>
              <span
                className={`font-semibold truncate max-w-[170px] ${
                  currentItem.hodStatus === 'Registered' ? 'text-emerald-400' : 'text-slate-400'
                }`}
                title={currentItem.hodName}
              >
                {currentItem.hodName}
              </span>
            </div>

            {/* Deadline */}
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Deadline:</span>
              </span>
              <span
                className={`font-bold font-mono ${
                  currentItem.isOverdue ? 'text-rose-400' : 'text-amber-300'
                }`}
              >
                {currentItem.deadlineText}
              </span>
            </div>
          </div>

          {/* Action Button: Jump into Radar */}
          <button
            type="button"
            onClick={() => onJumpToBottleneck(currentItem)}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 cursor-pointer transition-all transform active:scale-[0.98]"
          >
            <Target className="w-4 h-4" />
            <span>Inspect in Completion Radar →</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
         GAP-TO-DEADLINE MULTI-DIMENSION CARD
         ========================================================================= */}
      {activeInspectorUnit ? (
        <div className="bg-[#121622] rounded-2xl border border-slate-800 shadow-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                Gap-to-Deadline Inspector
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
              {activeInspectorUnit.level}
            </span>
          </div>

          <div>
            <h4 className="text-sm font-black text-white truncate">
              {activeInspectorUnit.name}
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {activeInspectorUnit.deptName}
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span className="text-slate-300">Completion</span>
              <span className="text-blue-400">{activeInspectorUnit.completionRate}%</span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${activeInspectorUnit.completionRate}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs py-1">
            <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-900/50">
              <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{activeInspectorUnit.submitted} Submitted</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Verified in LMS</span>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-900/50">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{activeInspectorUnit.pending} Pending</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Awaiting upload</span>
            </div>
          </div>

          <div className="space-y-2 text-xs border-t border-slate-800/80 pt-3 text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Deadline:</span>
              <span className="font-bold font-mono text-amber-300">
                {activeInspectorUnit.deadlineText}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Coordinator:</span>
              <span
                className={`font-semibold ${
                  activeInspectorUnit.coordinatorStatus === 'Assigned'
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {activeInspectorUnit.coordinatorName}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Last activity:</span>
              <span className="text-[11px] text-slate-400 font-mono text-right truncate max-w-[170px]">
                {activeInspectorUnit.lastActivity || '17 Sep, 8:42 PM'}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Runner-up Bottlenecks list */}
      {runnerUps.length > 0 && (
        <div className="bg-slate-900/70 rounded-xl border border-slate-800 p-3.5 space-y-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Secondary Operational Gaps
          </span>
          <div className="space-y-1.5">
            {runnerUps.map((ru, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onJumpToBottleneck(ru)}
                className="w-full text-left p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 text-xs transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="truncate pr-2">
                  <span className="font-semibold text-slate-200 group-hover:text-blue-300 block truncate">
                    {ru.program}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {ru.department.replace('Department of ', '')} • {ru.semesterLabel} • {ru.section} ({ru.pendingCourses} pending)
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
