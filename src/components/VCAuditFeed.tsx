import React, { useEffect, useState, useMemo } from 'react';
import { StorageService } from '../services/storageService';
import { AccessLogEntry } from '../types';
import { Activity, Clock, ShieldCheck, User, Database, Building2 } from 'lucide-react';

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

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const lowerQ = searchQuery.toLowerCase();
    return logs.filter(
      (log) =>
        log.userName.toLowerCase().includes(lowerQ) ||
        log.department.toLowerCase().includes(lowerQ) ||
        log.action.toLowerCase().includes(lowerQ) ||
        (log.program && log.program.toLowerCase().includes(lowerQ))
    );
  }, [logs, searchQuery]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[600px] animate-in fade-in duration-300">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
            <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Live System Audit Trail</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Real-time feed of all LMS operations across the university
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg w-48 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
          <button
            onClick={refreshLogs}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded transition-colors"
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
          <div className="space-y-1">
            {filteredLogs.map((log) => {
              const isUpload = log.action.toLowerCase().includes('submitted') || log.action.toLowerCase().includes('updated');
              const isDelete = log.action.toLowerCase().includes('delete');
              
              return (
                <div key={log.id} className="group p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {isUpload ? (
                      <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center border border-emerald-200 dark:border-emerald-800/50">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    ) : isDelete ? (
                      <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center border border-rose-200 dark:border-rose-800/50">
                        <Activity className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                        <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-900 dark:text-slate-200 font-medium leading-tight">
                      {log.action}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px]">
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <User className="w-3 h-3" />
                        <span className="font-semibold">{log.userName}</span> ({log.designation})
                      </span>
                      {log.department && (
                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-500">
                          <Building2 className="w-3 h-3" />
                          {log.department}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="shrink-0 text-right">
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap block">
                      {log.timestamp}
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
