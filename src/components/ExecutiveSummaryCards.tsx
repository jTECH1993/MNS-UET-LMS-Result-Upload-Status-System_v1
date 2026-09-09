import React from 'react';
import { ExecutiveSummary } from '../types';
import { CheckCircle2, Clock, PlayCircle, MinusCircle, BookOpen, Percent } from 'lucide-react';

interface Props {
  summary: ExecutiveSummary;
}

export const ExecutiveSummaryCards: React.FC<Props> = ({ summary }) => {
  return (
    <div id="executive-summary-section" className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden mb-6">
      <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-wider uppercase bg-emerald-700 px-2 py-0.5 rounded text-white">
            Section 02
          </span>
          <h3 className="font-semibold text-sm tracking-wide">EXECUTIVE SUMMARY</h3>
        </div>
        <span className="text-xs text-slate-300">
          Calculated dynamically for entered subjects only (blank rows excluded)
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 divide-x divide-y md:divide-y-0 divide-slate-200">
        {/* Total Subjects */}
        <div className="p-4 flex flex-col justify-between bg-slate-50/70">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold tracking-wider uppercase">Total Subjects</span>
            <BookOpen className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{summary.totalSubjects}</span>
            <span className="text-xs text-slate-500">active</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Excludes blank rows</div>
        </div>

        {/* Uploaded */}
        <div className="p-4 flex flex-col justify-between bg-emerald-50/50">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-xs font-bold tracking-wider uppercase">Uploaded</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-700">{summary.uploaded}</span>
            <span className="text-xs font-medium text-emerald-600">
              {summary.totalSubjects > 0 ? `${Math.round((summary.uploaded / summary.totalSubjects) * 100)}%` : '0%'}
            </span>
          </div>
          <div className="text-[11px] text-emerald-700 mt-1">LMS verified & complete</div>
        </div>

        {/* Pending */}
        <div className="p-4 flex flex-col justify-between bg-amber-50/50">
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-xs font-bold tracking-wider uppercase">Pending</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-700">{summary.pending}</span>
            <span className="text-xs font-medium text-amber-600">
              {summary.totalSubjects > 0 ? `${Math.round((summary.pending / summary.totalSubjects) * 100)}%` : '0%'}
            </span>
          </div>
          <div className="text-[11px] text-amber-700 mt-1">Awaiting entry / upload</div>
        </div>

        {/* In Progress */}
        <div className="p-4 flex flex-col justify-between bg-blue-50/50">
          <div className="flex items-center justify-between text-blue-800 mb-1">
            <span className="text-xs font-bold tracking-wider uppercase">In Progress</span>
            <PlayCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-blue-700">{summary.inProgress}</span>
            <span className="text-xs font-medium text-blue-600">
              {summary.totalSubjects > 0 ? `${Math.round((summary.inProgress / summary.totalSubjects) * 100)}%` : '0%'}
            </span>
          </div>
          <div className="text-[11px] text-blue-700 mt-1">Partially uploaded</div>
        </div>

        {/* Not Applicable */}
        <div className="p-4 flex flex-col justify-between bg-slate-50/50">
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span className="text-xs font-bold tracking-wider uppercase">Not Applicable</span>
            <MinusCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-700">{summary.notApplicable}</span>
            <span className="text-xs text-slate-500">excluded</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Not offered in Sem 1</div>
        </div>

        {/* Upload % */}
        <div className="p-4 flex flex-col justify-between bg-emerald-600 text-white">
          <div className="flex items-center justify-between text-emerald-100 mb-1">
            <span className="text-xs font-bold tracking-wider uppercase">Upload %</span>
            <Percent className="w-4 h-4 text-emerald-200" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight">{summary.uploadPercentage}%</span>
          </div>
          <div className="w-full bg-emerald-800/60 rounded-full h-1.5 mt-2 overflow-hidden">
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
