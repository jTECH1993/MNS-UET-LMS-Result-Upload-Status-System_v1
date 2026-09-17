import React from 'react';
import { DeadlineAgingRisk } from '../services/vcAnalyticsService';
import { Timer, AlertTriangle, AlertCircle, Clock, CalendarCheck } from 'lucide-react';

interface Props {
  risk: DeadlineAgingRisk;
  onFilterAging?: (bucket: 'overdue' | 'dueToday' | 'dueWithin3Days' | 'dueLater') => void;
}

export const DeadlineAgingChart: React.FC<Props> = ({ risk, onFilterAging }) => {
  const total = risk.overdue + risk.dueToday + risk.dueWithin3Days + risk.dueLater;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 flex items-center justify-center">
            <Timer className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Deadline Aging & Institutional Risk Chart
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Categorizes pending course sheets by deadline proximity and compliance urgency
            </p>
          </div>
        </div>

        <div className="text-xs font-bold text-slate-500">
          Total Pending: <span className="font-mono text-slate-900 dark:text-white">{total}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Overdue */}
        <div
          onClick={() => onFilterAging?.('overdue')}
          className="p-3.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100/70 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-rose-800 dark:text-rose-300 mb-1.5">
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              Overdue
            </span>
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded bg-rose-200/80 dark:bg-rose-900">
              Critical
            </span>
          </div>
          <div className="text-2xl font-black text-rose-900 dark:text-rose-200 font-mono">
            {risk.overdue}
          </div>
          <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-1">
            Expired result sheets requiring VC summons
          </p>
        </div>

        {/* Due Today */}
        <div
          onClick={() => onFilterAging?.('dueToday')}
          className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100/70 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300 mb-1.5">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Due Today
            </span>
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded bg-amber-200/80 dark:bg-amber-900">
              Urgent
            </span>
          </div>
          <div className="text-2xl font-black text-amber-900 dark:text-amber-200 font-mono">
            {risk.dueToday}
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
            Cutoff deadline today by 11:59 PM
          </p>
        </div>

        {/* Due in < 3 days */}
        <div
          onClick={() => onFilterAging?.('dueWithin3Days')}
          className="p-3.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 hover:bg-blue-100/70 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-blue-800 dark:text-blue-300 mb-1.5">
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-blue-600" />
              Due &lt; 3 Days
            </span>
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded bg-blue-200/80 dark:bg-blue-900">
              Warning
            </span>
          </div>
          <div className="text-2xl font-black text-blue-900 dark:text-blue-200 font-mono">
            {risk.dueWithin3Days}
          </div>
          <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-1">
            Nearing institutional cutoff threshold
          </p>
        </div>

        {/* Due > 3 days */}
        <div
          onClick={() => onFilterAging?.('dueLater')}
          className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            <span className="flex items-center gap-1">
              <CalendarCheck className="w-3.5 h-3.5 text-slate-500" />
              Due &gt; 3 Days
            </span>
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700">
              Standard
            </span>
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-white font-mono">
            {risk.dueLater}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Active evaluation and grading underway
          </p>
        </div>
      </div>
    </div>
  );
};
