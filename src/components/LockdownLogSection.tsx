import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Unlock,
  Lock,
  Timer,
  Sparkles,
  Search,
  Filter,
  Download,
  Trash2,
  Calendar,
  Layers,
  UserCheck,
  RefreshCw,
  ShieldAlert,
  ArrowUpDown,
  CheckCircle2,
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { LockdownLogEntry } from '../types';

interface LockdownLogSectionProps {
  currentSession?: string;
  currentSemester?: string;
  isCompact?: boolean;
  onClose?: () => void;
}

export const LockdownLogSection: React.FC<LockdownLogSectionProps> = ({
  currentSession,
  currentSemester,
  isCompact = false,
  onClose,
}) => {
  const [logs, setLogs] = useState<LockdownLogEntry[]>(() => StorageService.getLockdownLogs());
  const [sessionFilter, setSessionFilter] = useState<string>('ALL');
  const [semesterFilter, setSemesterFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortAscending, setSortAscending] = useState<boolean>(false);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync logs when event fires
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

  // Compute distinct session options from logs
  const sessionOptions = useMemo(() => {
    const sessions = new Set<string>();
    logs.forEach((log) => {
      if (log.session) {
        sessions.add(log.session.replace('Session ', '').trim());
      }
    });
    // Add current session if available
    if (currentSession) sessions.add(currentSession.trim());
    sessions.add('2023');
    sessions.add('2024');
    sessions.add('2025');
    return Array.from(sessions).sort();
  }, [logs, currentSession]);

  // Filter and sort logs
  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        // Session filter
        if (sessionFilter !== 'ALL') {
          const cleanSessFilter = sessionFilter.toLowerCase();
          const logSess = (log.session || '').toLowerCase();
          if (!logSess.includes(cleanSessFilter)) return false;
        }

        // Semester filter
        if (semesterFilter !== 'ALL') {
          const logSem = (log.semester || '').toLowerCase();
          if (semesterFilter === 'ALL_SEM') {
            if (!logSem.includes('all') && !logSem.includes('1–8') && !logSem.includes('1-8')) {
              return false;
            }
          } else {
            if (!logSem.includes(`semester ${semesterFilter}`) && !logSem.includes(`sem ${semesterFilter}`) && !logSem.includes(`semesters: ${semesterFilter}`) && !logSem.includes('all')) {
              return false;
            }
          }
        }

        // Action filter
        if (actionFilter !== 'ALL') {
          if (log.action !== actionFilter) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchAdmin = (log.adminName || '').toLowerCase().includes(q);
          const matchEmail = (log.adminEmail || '').toLowerCase().includes(q);
          const matchSession = (log.session || '').toLowerCase().includes(q);
          const matchSemester = (log.semester || '').toLowerCase().includes(q);
          const matchDetails = (log.details || '').toLowerCase().includes(q);
          const matchAction = (log.actionLabel || '').toLowerCase().includes(q);
          if (!matchAdmin && !matchEmail && !matchSession && !matchSemester && !matchDetails && !matchAction) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.startTimestamp).getTime();
        const timeB = new Date(b.startTimestamp).getTime();
        return sortAscending ? timeA - timeB : timeB - timeA;
      });
  }, [logs, sessionFilter, semesterFilter, actionFilter, searchQuery, sortAscending]);

  // Aggregate stats
  const stats = useMemo(() => {
    let unlocked = 0;
    let enforced = 0;
    let deadlines = 0;
    let batch = 0;
    logs.forEach((log) => {
      if (log.action === 'LOCKDOWN_OFF') unlocked++;
      else if (log.action === 'LOCKDOWN_ON') enforced++;
      else if (log.action === 'DEADLINE_CHANGED') deadlines++;
      else if (log.action === 'BATCH_OVERRIDE') batch++;
    });
    return { total: logs.length, unlocked, enforced, deadlines, batch };
  }, [logs]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Log ID',
      'Start Timestamp (ISO)',
      'Formatted Timestamp',
      'Session',
      'Semester',
      'Action Type',
      'Action Description',
      'Admin Name',
      'Admin Email',
      'Admin Role',
      'Admin Designation',
      'Details / Remarks',
      'Previous State',
      'New State',
    ];

    const rows = filteredLogs.map((log) => [
      `"${log.id}"`,
      `"${log.startTimestamp}"`,
      `"${log.formattedTimestamp || ''}"`,
      `"${(log.session || '').replace(/"/g, '""')}"`,
      `"${(log.semester || '').replace(/"/g, '""')}"`,
      `"${log.action}"`,
      `"${(log.actionLabel || '').replace(/"/g, '""')}"`,
      `"${(log.adminName || '').replace(/"/g, '""')}"`,
      `"${(log.adminEmail || '').replace(/"/g, '""')}"`,
      `"${(log.adminRole || '').replace(/"/g, '""')}"`,
      `"${(log.adminDesignation || '').replace(/"/g, '""')}"`,
      `"${(log.details || '').replace(/"/g, '""')}"`,
      `"${(log.previousState || '').replace(/"/g, '""')}"`,
      `"${(log.newState || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MNSUET_Lockdown_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearLogs = () => {
    StorageService.clearLockdownLogs();
    setLogs([]);
    setConfirmClear(false);
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const now = new Date().getTime();
      const past = new Date(isoString).getTime();
      const diffSec = Math.floor((now - past) / 1000);
      if (diffSec < 45) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      const days = Math.floor(diffSec / 86400);
      return days === 1 ? '1 day ago' : `${days} days ago`;
    } catch {
      return '';
    }
  };

  return (
    <div
      id="lockdown-log-section"
      className={`rounded-xl border border-slate-700/80 bg-slate-900/95 text-slate-200 overflow-hidden shadow-2xl ${
        isCompact ? 'p-3' : 'p-4 sm:p-5'
      }`}
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/70">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                Institutional Lockdown Log &amp; Audit Trail
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {logs.length} Total Events
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronological log of Vice Chancellor and administrative lockdown overrides, lifts, and deadline triggers by session and semester.
            </p>
          </div>
        </div>

        {/* Top Control Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600/80 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            title="Export filtered lockdown logs to CSV"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export CSV</span>
          </button>

          {confirmClear ? (
            <div className="flex items-center gap-1.5 bg-rose-950/80 border border-rose-700 px-2 py-1 rounded-lg">
              <span className="text-[11px] text-rose-200 font-bold">Clear all?</span>
              <button
                type="button"
                onClick={handleClearLogs}
                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-extrabold cursor-pointer"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-600/70 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Clear log history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close Log View"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3.5">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
            <Unlock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Lockdowns Lifted</div>
            <div className="text-lg font-black text-emerald-300 tabular-nums">{stats.unlocked}</div>
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Lockdowns Enforced</div>
            <div className="text-lg font-black text-rose-300 tabular-nums">{stats.enforced}</div>
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">
            <Timer className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Deadlines Set</div>
            <div className="text-lg font-black text-indigo-300 tabular-nums">{stats.deadlines}</div>
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Batch Directives</div>
            <div className="text-lg font-black text-amber-300 tabular-nums">{stats.batch}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl mb-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          {/* Search box */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search admin, session, semester, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Session filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 shrink-0">Session:</span>
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Sessions</option>
              {sessionOptions.map((sess) => (
                <option key={sess} value={sess}>
                  Session {sess}
                </option>
              ))}
            </select>
          </div>

          {/* Semester filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 shrink-0">Semester:</span>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Semesters</option>
              <option value="ALL_SEM">All Semesters (1–8)</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={String(s)}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          {/* Action filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 shrink-0">Action:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Actions</option>
              <option value="LOCKDOWN_OFF">🔓 Lockdown Lifted (Turned OFF)</option>
              <option value="LOCKDOWN_ON">🔒 Lockdown Enforced (Turned ON)</option>
              <option value="DEADLINE_CHANGED">⏱️ Deadline Set / Changed</option>
              <option value="BATCH_OVERRIDE">⚡ Batch Directive</option>
            </select>
          </div>
        </div>

        {/* Sort direction toggle & count badge */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSortAscending(!sortAscending)}
            className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            title="Toggle sort by timestamp"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>{sortAscending ? 'Oldest First' : 'Newest First'}</span>
          </button>
          <span className="text-[11px] text-slate-400 font-medium">
            Showing <strong className="text-white">{filteredLogs.length}</strong> of {logs.length}
          </span>
        </div>
      </div>

      {/* Logs Table / List */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-10 px-4 bg-slate-950/40 border border-slate-800 rounded-xl">
          <History className="w-10 h-10 text-slate-600 mx-auto mb-2.5 stroke-[1.5]" />
          <h4 className="text-sm font-bold text-slate-300">No Lockdown Log Entries Found</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            {searchQuery || sessionFilter !== 'ALL' || semesterFilter !== 'ALL' || actionFilter !== 'ALL'
              ? 'No historical events match your active search and filter criteria. Try resetting the filters.'
              : 'Past lockdown events triggered by the Vice Chancellor or administrative system will be recorded here.'}
          </p>
          {(searchQuery || sessionFilter !== 'ALL' || semesterFilter !== 'ALL' || actionFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSessionFilter('ALL');
                setSemesterFilter('ALL');
                setActionFilter('ALL');
              }}
              className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-800 rounded-xl shadow-inner">
          <table className="w-full text-xs text-left text-slate-300 border-collapse">
            <thead className="bg-slate-800/90 text-slate-300 uppercase tracking-wider font-extrabold text-[11px] border-b border-slate-700">
              <tr>
                <th className="py-3 px-3.5 border-r border-slate-700/60 min-w-[160px]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Start Timestamp</span>
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-slate-700/60 min-w-[130px]">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Session</span>
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-slate-700/60 min-w-[120px]">
                  <span>Semester</span>
                </th>
                <th className="py-3 px-3.5 border-r border-slate-700/60 min-w-[170px]">
                  <span>Action / Event</span>
                </th>
                <th className="py-3 px-3.5 border-r border-slate-700/60 min-w-[180px]">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Admin Trigger</span>
                  </div>
                </th>
                <th className="py-3 px-3.5 min-w-[240px]">
                  <span>Details / Remarks</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/50">
              {filteredLogs.map((log) => {
                const isOff = log.action === 'LOCKDOWN_OFF';
                const isOn = log.action === 'LOCKDOWN_ON';
                const isDeadline = log.action === 'DEADLINE_CHANGED';
                const isBatch = log.action === 'BATCH_OVERRIDE';

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-800/50 transition-colors group"
                  >
                    {/* Start Timestamp Column */}
                    <td className="py-3 px-3.5 border-r border-slate-800/80 align-top">
                      <div className="font-bold text-white text-xs">
                        {log.formattedTimestamp || new Date(log.startTimestamp).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span className="inline-block px-1.5 py-0.2 rounded bg-slate-800 font-mono text-[9px] text-slate-300">
                          {formatRelativeTime(log.startTimestamp)}
                        </span>
                      </div>
                    </td>

                    {/* Academic Session Column */}
                    <td className="py-3 px-3 border-r border-slate-800/80 align-top">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black bg-slate-800 text-slate-200 border border-slate-700">
                        {log.session}
                      </span>
                    </td>

                    {/* Semester Column */}
                    <td className="py-3 px-3 border-r border-slate-800/80 align-top">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                        {log.semester}
                      </span>
                    </td>

                    {/* Action Column */}
                    <td className="py-3 px-3.5 border-r border-slate-800/80 align-top">
                      {isOff && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black bg-emerald-950/90 text-emerald-300 border border-emerald-700/80 shadow-2xs">
                          <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{log.actionLabel}</span>
                        </div>
                      )}
                      {isOn && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black bg-rose-950/90 text-rose-300 border border-rose-700/80 shadow-2xs">
                          <Lock className="w-3.5 h-3.5 text-rose-400" />
                          <span>{log.actionLabel}</span>
                        </div>
                      )}
                      {isDeadline && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black bg-indigo-950/90 text-indigo-300 border border-indigo-700/80 shadow-2xs">
                          <Timer className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{log.actionLabel}</span>
                        </div>
                      )}
                      {isBatch && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black bg-amber-950/90 text-amber-300 border border-amber-700/80 shadow-2xs">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>{log.actionLabel}</span>
                        </div>
                      )}
                      {log.newState && (
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
                          State: <strong className="text-slate-200">{log.newState}</strong>
                        </div>
                      )}
                    </td>

                    {/* Admin Trigger Column */}
                    <td className="py-3 px-3.5 border-r border-slate-800/80 align-top">
                      <div className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                        <span>{log.adminName || 'Vice Chancellor'}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-950 text-emerald-300 border border-emerald-700">
                          {log.adminRole || 'VC'}
                        </span>
                      </div>
                      {log.adminEmail && (
                        <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                          {log.adminEmail}
                        </div>
                      )}
                      {log.adminDesignation && (
                        <div className="text-[10px] text-slate-500 mt-0.5 italic">
                          {log.adminDesignation}
                        </div>
                      )}
                    </td>

                    {/* Details Column */}
                    <td className="py-3 px-3.5 align-top">
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {log.details || 'Administrative lockdown action recorded.'}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
