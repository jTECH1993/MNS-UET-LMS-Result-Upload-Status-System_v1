import React, { useState } from 'react';
import { ActionRequiredException } from '../services/vcAnalyticsService';
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  UserX,
  Building2,
  ChevronRight,
  Filter,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface Props {
  exceptions: ActionRequiredException[];
  onSelectException: (exception: ActionRequiredException) => void;
}

export const ActionRequiredPanel: React.FC<Props> = ({
  exceptions,
  onSelectException,
}) => {
  const [activeTab, setActiveTab] = useState<
    'ALL' | 'OVERDUE' | 'CRITICAL_LOW' | 'PARTIAL' | 'NO_COORDINATOR' | 'NO_HOD'
  >('ALL');

  const overdueList = exceptions.filter((e) => e.category === 'OVERDUE');
  const lowList = exceptions.filter((e) => e.category === 'CRITICAL_LOW');
  const partialList = exceptions.filter((e) => e.category === 'PARTIAL');
  const noCoordList = exceptions.filter((e) => e.category === 'NO_COORDINATOR');
  const noHodList = exceptions.filter((e) => e.category === 'NO_HOD');

  const displayedList =
    activeTab === 'ALL'
      ? exceptions
      : exceptions.filter((e) => e.category === activeTab);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-900/60 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 flex items-center justify-center font-bold">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <span>Executive Action Required</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-extrabold border border-rose-200">
                {exceptions.length} Exceptions
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Institutional intelligence surfacing anomalies, overdue submissions & unassigned coordinators
            </p>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shrink-0 border ${
            activeTab === 'ALL'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
          }`}
        >
          All ({exceptions.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('OVERDUE')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shrink-0 border flex items-center gap-1.5 ${
            activeTab === 'OVERDUE'
              ? 'bg-rose-700 text-white border-transparent'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900 hover:bg-rose-100'
          }`}
        >
          <span>🔴 Overdue</span>
          <span className="font-mono">({overdueList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CRITICAL_LOW')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shrink-0 border flex items-center gap-1.5 ${
            activeTab === 'CRITICAL_LOW'
              ? 'bg-amber-600 text-white border-transparent'
              : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900 hover:bg-amber-100'
          }`}
        >
          <span>🟠 Below 50%</span>
          <span className="font-mono">({lowList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PARTIAL')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shrink-0 border flex items-center gap-1.5 ${
            activeTab === 'PARTIAL'
              ? 'bg-blue-600 text-white border-transparent'
              : 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900 hover:bg-blue-100'
          }`}
        >
          <span>🟡 Partial</span>
          <span className="font-mono">({partialList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('NO_COORDINATOR')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shrink-0 border flex items-center gap-1.5 ${
            activeTab === 'NO_COORDINATOR'
              ? 'bg-slate-700 text-white border-transparent'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
          }`}
        >
          <span>⚪ No Coordinator</span>
          <span className="font-mono">({noCoordList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('NO_HOD')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shrink-0 border flex items-center gap-1.5 ${
            activeTab === 'NO_HOD'
              ? 'bg-purple-700 text-white border-transparent'
              : 'bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-900 hover:bg-purple-100'
          }`}
        >
          <span>⚪ HOD Missing</span>
          <span className="font-mono">({noHodList.length})</span>
        </button>
      </div>

      {/* List of Exceptions */}
      <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
        {displayedList.length === 0 ? (
          <div className="text-center py-8 text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-xs">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
            No active exceptions in this category.
          </div>
        ) : (
          displayedList.map((exc) => {
            const isRed = exc.severity === 'red';
            const isOrange = exc.severity === 'orange';
            const isYellow = exc.severity === 'yellow';

            return (
              <div
                key={exc.id}
                onClick={() => onSelectException(exc)}
                className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                  isRed
                    ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 hover:bg-rose-100/60'
                    : isOrange
                    ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 hover:bg-amber-100/60'
                    : isYellow
                    ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 hover:bg-blue-100/60'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-sm shrink-0">
                    {isRed ? '🔴' : isOrange ? '🟠' : isYellow ? '🟡' : '⚪'}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-xs truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                        {exc.message}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                        {exc.deptCode}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {exc.detail}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 group-hover:underline">
                    Inspect
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
