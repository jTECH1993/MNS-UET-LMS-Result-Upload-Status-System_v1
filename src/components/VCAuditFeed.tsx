import React, { useEffect, useState, useMemo } from 'react';
import { StorageService } from '../services/storageService';
import { AuthService } from '../services/authService';
import { AccessLogEntry } from '../types';
import { Activity, Clock, ShieldCheck, User, Database, Building2, GraduationCap, Calendar } from 'lucide-react';

function formatAuditDateTime(timestampStr: string): { day: string; date: string; time12: string } {
  try {
    const d = new Date(timestampStr);
    if (isNaN(d.getTime())) {
      return { day: '', date: timestampStr, time12: '' };
    }
    const day = d.toLocaleDateString('en-US', { weekday: 'long' });
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const time12 = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
    return { day, date, time12 };
  } catch (e) {
    return { day: '', date: timestampStr, time12: '' };
  }
}

export const VCAuditFeed: React.FC = () => {
  const [logs, setLogs] = useState<AccessLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const refreshLogs = () => {
    setLogs(StorageService.getAccessLogs());
  };

  useEffect(() => {
    refreshLogs();
    
    // Listen for storage updates to refresh logs in real-time
    const handleStorageUpdate = () => refreshLogs();
    window.addEventListener('mnsuet_storage_updated', handleStorageUpdate);
    
    // Fallback polling every 10 seconds just in case
    const interval = setInterval(refreshLogs, 10000);
    
    return () => {
      window.removeEventListener('mnsuet_storage_updated', handleStorageUpdate);
      clearInterval(interval);
    };
  }, []);

  const getCoordinatorForLog = (log: AccessLogEntry) => {
    if (log.coordinatorName) {
      return {
        name: log.coordinatorName,
        designation: log.coordinatorDesignation || 'Program Coordinator',
      };
    }
    try {
      const accounts = AuthService.getAccounts();
      const coord = accounts.find((a) => {
        if (a.role !== 'COORDINATOR' && a.role !== 'LECTURER') return false;
        if (log.program && (a.program === log.program || a.assignedPrograms?.includes(log.program))) return true;
        if (log.department && a.department.trim().toLowerCase() === log.department.trim().toLowerCase()) return true;
        return false;
      });
      if (coord) {
        return { name: coord.name, designation: coord.designation };
      }
    } catch (e) {}

    if (log.department?.includes('Computer Science')) {
      return {
        name: 'Engr. Muhammad Talha Jahangir',
        designation: 'Program Coordinator (BS AI) / Lecturer',
      };
    }
    return null;
  };

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const lowerQ = searchQuery.toLowerCase();
    return logs.filter((log) => {
      const coord = getCoordinatorForLog(log);
      const dt = formatAuditDateTime(log.timestamp);
      return (
        log.userName.toLowerCase().includes(lowerQ) ||
        log.department.toLowerCase().includes(lowerQ) ||
        log.action.toLowerCase().includes(lowerQ) ||
        (log.program && log.program.toLowerCase().includes(lowerQ)) ||
        (coord && coord.name.toLowerCase().includes(lowerQ)) ||
        dt.day.toLowerCase().includes(lowerQ) ||
        dt.date.toLowerCase().includes(lowerQ)
      );
    });
  }, [logs, searchQuery]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[640px] animate-in fade-in duration-300">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg text-emerald-700 dark:text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Live System Audit Trail</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                12-Hour Sync • Full Coordinator Traceability
              </span>
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Real-time audit log with program coordinator details, designated academic day, and 12-hour timestamps
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="text"
            placeholder="Search coordinator, program, day..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg w-56 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
          <button
            onClick={refreshLogs}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded transition-colors cursor-pointer"
            title="Refresh manually"
          >
            <Clock className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
            <Database className="w-10 h-10 opacity-20" />
            <p className="text-sm font-medium">No system activity logs found.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredLogs.map((log) => {
              const isUpload = log.action.toLowerCase().includes('submitted') || log.action.toLowerCase().includes('updated');
              const isDelete = log.action.toLowerCase().includes('delete') || log.action.toLowerCase().includes('purged');
              const coord = getCoordinatorForLog(log);
              const { day, date, time12 } = formatAuditDateTime(log.timestamp);
              
              return (
                <div
                  key={log.id}
                  className="group p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700 transition-colors flex items-start gap-3"
                >
                  <div className="shrink-0 mt-1">
                    {isUpload ? (
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                    ) : isDelete ? (
                      <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400">
                        <Activity className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-xs text-slate-900 dark:text-slate-100 font-bold leading-tight">
                        {log.action}
                      </p>
                      {log.program && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {log.program}
                        </span>
                      )}
                      {log.shift && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {log.shift}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-1.5 text-[11px]">
                      {/* Coordinator Detail Column */}
                      <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/30 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-900/60">
                        <GraduationCap className="w-3.5 h-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                        <div className="truncate">
                          <span className="font-bold text-[10px] uppercase text-emerald-900 dark:text-emerald-200 block">
                            Program Coordinator:
                          </span>
                          <span className="font-semibold text-emerald-950 dark:text-emerald-100">
                            {coord ? coord.name : 'Engr. Muhammad Talha Jahangir'}
                          </span>
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 ml-1">
                            ({coord ? coord.designation : 'Coordinator BS AI / Lecturer'})
                          </span>
                        </div>
                      </div>

                      {/* Department & Actor Column */}
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded border border-slate-200 dark:border-slate-700/60">
                        <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                        <div className="truncate">
                          <span className="font-bold text-[10px] uppercase text-slate-500 dark:text-slate-400 block">
                            Department / Actor:
                          </span>
                          <span className="font-medium text-slate-900 dark:text-slate-200">
                            {log.department || 'Department of Computer Science'}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">
                            • Actor: {log.userName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Better Date & Time in 12-Hour format with Day of the Week */}
                  <div className="shrink-0 text-right bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-slate-800 dark:text-slate-200">
                      <Calendar className="w-3 h-3 text-emerald-600" />
                      <span>{day || 'Today'}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                      {date}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 block mt-0.5">
                      {time12}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
