import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  ShieldAlert,
  Calendar,
  Lock,
  Unlock,
  Clock,
  Sparkles,
  AlertTriangle,
  Info,
  Layers,
  Filter,
} from 'lucide-react';
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
import { StorageService } from '../services/storageService';
import { LockdownLogEntry } from '../types';

interface LockdownAnalyticsSectionProps {
  currentSession?: string;
  currentSemester?: string;
  isCompact?: boolean;
}

export const LockdownAnalyticsSection: React.FC<LockdownAnalyticsSectionProps> = ({
  currentSession,
  currentSemester,
  isCompact = false,
}) => {
  const [logs, setLogs] = useState<LockdownLogEntry[]>(() => StorageService.getLockdownLogs());
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string>('ALL');

  // Real-time synchronization
  useEffect(() => {
    const handleUpdate = () => {
      setLogs(StorageService.getLockdownLogs());
    };
    window.addEventListener('mnsuet_lockdown_logs_updated', handleUpdate);
    window.addEventListener('mnsuet_deadline_updated', handleUpdate);
    return () => {
      window.removeEventListener('mnsuet_lockdown_logs_updated', handleUpdate);
      window.removeEventListener('mnsuet_deadline_updated', handleUpdate);
    };
  }, []);

  // Distinct Sessions list
  const sessionOptions = useMemo(() => {
    const sessions = new Set<string>();
    logs.forEach((log) => {
      if (log.session) {
        sessions.add(log.session.replace('Session ', '').trim());
      }
    });
    if (currentSession) sessions.add(currentSession.trim());
    sessions.add('2023');
    sessions.add('2024');
    sessions.add('2025');
    return Array.from(sessions).sort();
  }, [logs, currentSession]);

  // Filtered logs by session
  const filteredLogs = useMemo(() => {
    if (selectedSessionFilter === 'ALL') return logs;
    return logs.filter((log) => {
      const logSess = (log.session || '').toLowerCase();
      return logSess.includes(selectedSessionFilter.toLowerCase());
    });
  }, [logs, selectedSessionFilter]);

  // Process frequency per semester (Semesters 1 through 8 + Universal)
  const semesterChartData = useMemo(() => {
    const semesterMap: Record<
      string,
      {
        semesterLabel: string;
        semesterNum: number;
        enforcedCount: number;
        liftedCount: number;
        deadlineChangedCount: number;
        batchCount: number;
        totalEvents: number;
      }
    > = {};

    // Initialize Semesters 1 to 8
    for (let i = 1; i <= 8; i++) {
      const key = `Sem ${i}`;
      semesterMap[key] = {
        semesterLabel: `Semester ${i}`,
        semesterNum: i,
        enforcedCount: 0,
        liftedCount: 0,
        deadlineChangedCount: 0,
        batchCount: 0,
        totalEvents: 0,
      };
    }

    // Add Universal/All Semesters category
    semesterMap['Universal'] = {
      semesterLabel: 'All Sem (1–8)',
      semesterNum: 9,
      enforcedCount: 0,
      liftedCount: 0,
      deadlineChangedCount: 0,
      batchCount: 0,
      totalEvents: 0,
    };

    filteredLogs.forEach((log) => {
      const semStr = (log.semester || '').toLowerCase();
      let targetKey = 'Universal';

      if (semStr.includes('all') || semStr.includes('1–8') || semStr.includes('1-8')) {
        targetKey = 'Universal';
      } else {
        for (let i = 1; i <= 8; i++) {
          if (semStr.includes(`semester ${i}`) || semStr.includes(`sem ${i}`) || semStr.endsWith(`${i}`)) {
            targetKey = `Sem ${i}`;
            break;
          }
        }
      }

      if (!semesterMap[targetKey]) {
        semesterMap[targetKey] = {
          semesterLabel: targetKey,
          semesterNum: 99,
          enforcedCount: 0,
          liftedCount: 0,
          deadlineChangedCount: 0,
          batchCount: 0,
          totalEvents: 0,
        };
      }

      const item = semesterMap[targetKey];
      item.totalEvents++;

      if (log.action === 'LOCKDOWN_ON') item.enforcedCount++;
      else if (log.action === 'LOCKDOWN_OFF') item.liftedCount++;
      else if (log.action === 'DEADLINE_CHANGED') item.deadlineChangedCount++;
      else if (log.action === 'BATCH_OVERRIDE') item.batchCount++;
    });

    return Object.values(semesterMap).sort((a, b) => a.semesterNum - b.semesterNum);
  }, [filteredLogs]);

  // Overall Analytical Highlights
  const analyticsSummary = useMemo(() => {
    let totalEnforced = 0;
    let totalLifted = 0;
    let totalDeadlines = 0;

    filteredLogs.forEach((l) => {
      if (l.action === 'LOCKDOWN_ON') totalEnforced++;
      else if (l.action === 'LOCKDOWN_OFF') totalLifted++;
      else if (l.action === 'DEADLINE_CHANGED') totalDeadlines++;
    });

    // Find semester with highest enforced count
    let maxDisruptedSem = 'Semester 1';
    let maxDisruptedCount = -1;

    semesterChartData.forEach((item) => {
      if (item.enforcedCount > maxDisruptedCount) {
        maxDisruptedCount = item.enforcedCount;
        maxDisruptedSem = item.semesterLabel;
      }
    });

    const netConstraintRatio =
      totalEnforced + totalLifted > 0
        ? Math.round((totalEnforced / (totalEnforced + totalLifted)) * 100)
        : 50;

    return {
      totalEvents: filteredLogs.length,
      totalEnforced,
      totalLifted,
      totalDeadlines,
      maxDisruptedSem,
      maxDisruptedCount: Math.max(0, maxDisruptedCount),
      netConstraintRatio,
    };
  }, [filteredLogs, semesterChartData]);

  return (
    <div
      id="lockdown-analytics-section"
      className={`rounded-xl border border-slate-700/80 bg-slate-900/95 text-slate-200 overflow-hidden shadow-2xl ${
        isCompact ? 'p-3' : 'p-4 sm:p-5'
      }`}
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/70">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                Institutional Lockdown Disruption Analytics
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Frequency Analysis
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualize lockdown frequencies per semester to identify recurring academic disruption patterns and optimize result submission deadlines.
            </p>
          </div>
        </div>

        {/* Session Filter Dropdown */}
        <div className="flex items-center gap-2 self-start sm:self-center bg-slate-950/80 p-1.5 rounded-xl border border-slate-700">
          <Filter className="w-3.5 h-3.5 text-indigo-400 ml-1" />
          <span className="text-xs font-bold text-slate-400">Session Scope:</span>
          <select
            value={selectedSessionFilter}
            onChange={(e) => setSelectedSessionFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Academic Sessions</option>
            {sessionOptions.map((s) => (
              <option key={s} value={s}>
                Session {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Analytical Metric Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-4">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
              Most Disrupted Cohort
            </div>
            <div className="text-base font-black text-rose-300 mt-0.5">
              {analyticsSummary.maxDisruptedSem}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              <span className="font-bold text-rose-400">{analyticsSummary.maxDisruptedCount}</span> lockdown enforcement triggers
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
              Total Enforced Lockdowns
            </div>
            <div className="text-xl font-black text-rose-400 mt-0.5 tabular-nums">
              {analyticsSummary.totalEnforced}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Across {analyticsSummary.totalEvents} audit events
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
              Lockdowns Lifted (Unlocked)
            </div>
            <div className="text-xl font-black text-emerald-400 mt-0.5 tabular-nums">
              {analyticsSummary.totalLifted}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Special VC administrative overrides
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            <Unlock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
              Enforcement Ratio
            </div>
            <div className="text-xl font-black text-indigo-300 mt-0.5 tabular-nums">
              {analyticsSummary.netConstraintRatio}%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Enforced vs Lifted distribution
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Bar Chart Visualization */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 my-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span>Lockdown Event Frequency per Semester Cohort</span>
            </h4>
            <p className="text-xs text-slate-400">
              Comparative distribution of enforced lockdowns, lifts, and deadline adjustments across Semesters 1 through 8.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Enforced
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Lifted
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span> Deadlines
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={semesterChartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis
                dataKey="semesterLabel"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#475569' }}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                allowDecimals={false}
                tickLine={false}
                axisLine={{ stroke: '#475569' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#f8fafc',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                }}
                itemStyle={{ color: '#cbd5e1' }}
              />
              <Bar
                dataKey="enforcedCount"
                name="Lockdowns Enforced"
                fill="#f43f5e"
                radius={[4, 4, 0, 0]}
                barSize={18}
              />
              <Bar
                dataKey="liftedCount"
                name="Lockdowns Lifted"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                barSize={18}
              />
              <Bar
                dataKey="deadlineChangedCount"
                name="Deadlines Set"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
                barSize={18}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Executive Pattern Analysis & Recommendations */}
      <div className="p-4 bg-indigo-950/40 border border-indigo-800/60 rounded-xl text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-indigo-300">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Executive Pattern Insights & Institutional Recommendations</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          Historical analysis indicates that <strong className="text-white">{analyticsSummary.maxDisruptedSem}</strong> exhibits the highest frequency of lockdown enforcement constraints. This pattern typically stems from initial student enrollment adjustments in early semesters and final thesis result compilation bottlenecks in senior semesters.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-indigo-800/40 text-[11px] text-slate-400">
          <div className="flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              <strong>Recommendation 1:</strong> Pre-schedule automated 48-hour reminder alerts for HODs 3 days prior to official semester deadline triggers.
            </span>
          </div>
          <div className="flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              <strong>Recommendation 2:</strong> Use granular scope lockdown directives to selectively lift restrictions for lagging departments without unlocking compliant cohorts.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
