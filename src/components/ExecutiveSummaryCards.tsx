import React from 'react';
import { ExecutiveSummary } from '../types';
import { CheckCircle2, Clock, PlayCircle, MinusCircle, BookOpen, Percent } from 'lucide-react';

interface Props {
  summary: ExecutiveSummary;
}

export const ExecutiveSummaryCards: React.FC<Props> = ({ summary }) => {
  return (
    <div id="executive-summary-section" className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden mb-6">
      <div className="bg-slate-800 text-white px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-wider uppercase bg-emerald-700 px-2 py-0.5 rounded text-white shrink-0">
            Section 02
          </span>
          <h3 className="font-semibold text-sm tracking-wide">EXECUTIVE SUMMARY</h3>
        </div>
        <span className="text-[11px] sm:text-xs text-slate-300">
          Calculated dynamically for entered subjects only (blank rows excluded)
        </span>
      </div>

      <div className="p-3 sm:p-4 bg-slate-50/60 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
        {/* Total Subjects */}
        <div className="p-3.5 sm:p-4 flex flex-col justify-between bg-white rounded-lg border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1 gap-1">
            <span className="text-[11px] sm:text-xs font-bold tracking-wider uppercase truncate">Total Subjects</span>
            <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{summary.totalSubjects}</span>
            <span className="text-xs font-semibold text-slate-500">active</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500">Excludes blank rows</div>
        </div>

        {/* Uploaded */}
        <div className="p-3.5 sm:p-4 flex flex-col justify-between bg-emerald-50/60 rounded-lg border border-emerald-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 mb-1 gap-1">
            <span className="text-[11px] sm:text-xs font-bold tracking-wider uppercase truncate">Uploaded</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">{summary.uploaded}</span>
            <span className="text-xs font-bold text-emerald-600">
              {summary.totalSubjects > 0 ? `${Math.round((summary.uploaded / summary.totalSubjects) * 100)}%` : '0%'}
            </span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-emerald-700 font-medium">LMS verified &amp; complete</div>
        </div>

        {/* Pending */}
        <div className="p-3.5 sm:p-4 flex flex-col justify-between bg-amber-50/60 rounded-lg border border-amber-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 mb-1 gap-1">
            <span className="text-[11px] sm:text-xs font-bold tracking-wider uppercase truncate">Pending</span>
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl sm:text-3xl font-black text-amber-700 font-mono">{summary.pending}</span>
            <span className="text-xs font-bold text-amber-600">
              {summary.totalSubjects > 0 ? `${Math.round((summary.pending / summary.totalSubjects) * 100)}%` : '0%'}
            </span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-amber-700 font-medium">Awaiting entry / upload</div>
        </div>

        {/* In Progress */}
        <div className="p-3.5 sm:p-4 flex flex-col justify-between bg-blue-50/60 rounded-lg border border-blue-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-blue-800 mb-1 gap-1">
            <span className="text-[11px] sm:text-xs font-bold tracking-wider uppercase truncate">In Progress</span>
            <PlayCircle className="w-4 h-4 text-blue-600 shrink-0" />
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl sm:text-3xl font-black text-blue-700 font-mono">{summary.inProgress}</span>
            <span className="text-xs font-bold text-blue-600">
              {summary.totalSubjects > 0 ? `${Math.round((summary.inProgress / summary.totalSubjects) * 100)}%` : '0%'}
            </span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-blue-700 font-medium">Partially uploaded</div>
        </div>

        {/* Not Applicable */}
        <div className="p-3.5 sm:p-4 flex flex-col justify-between bg-slate-100/70 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-600 mb-1 gap-1">
            <span className="text-[11px] sm:text-xs font-bold tracking-wider uppercase truncate">Not Applicable</span>
            <MinusCircle className="w-4 h-4 text-slate-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl sm:text-3xl font-black text-slate-700 font-mono">{summary.notApplicable}</span>
            <span className="text-xs font-semibold text-slate-500">excluded</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500">Not offered in semester</div>
        </div>

        {/* Upload % */}
        <div className="p-3.5 sm:p-4 flex flex-col justify-between bg-emerald-700 text-white rounded-lg border border-emerald-800 shadow-xs">
          <div className="flex items-center justify-between text-emerald-100 mb-1 gap-1">
            <span className="text-[11px] sm:text-xs font-bold tracking-wider uppercase truncate">Upload %</span>
            <Percent className="w-4 h-4 text-emerald-200 shrink-0" />
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl sm:text-3xl font-black tracking-tight font-mono">{summary.uploadPercentage}%</span>
          </div>
          <div className="w-full bg-emerald-900/60 rounded-full h-1.5 mt-1 overflow-hidden">
            <div
              className="bg-white h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(summary.uploadPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
