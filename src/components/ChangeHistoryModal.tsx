import React, { useState, useEffect, useMemo } from 'react';
import { AuditTrailService, AuditTrailRecord } from '../services/auditTrailService';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import {
  X,
  History,
  Search,
  Filter,
  Download,
  ShieldCheck,
  User,
  Clock,
  Calendar,
  Building2,
  GraduationCap,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  Tag,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialDepartment?: string;
  initialProgram?: string;
  initialShift?: string;
}

export const ChangeHistoryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialDepartment = '',
  initialProgram = '',
  initialShift = '',
}) => {
  const [logs, setLogs] = useState<AuditTrailRecord[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>(initialDepartment);
  const [selectedProg, setSelectedProg] = useState<string>(initialProgram);
  const [selectedShift, setSelectedShift] = useState<string>(initialShift);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('ALL');

  useEffect(() => {
    if (isOpen) {
      setSelectedDept(initialDepartment);
      setSelectedProg(initialProgram);
      setSelectedShift(initialShift);
      refreshLogs();
    }
  }, [isOpen, initialDepartment, initialProgram, initialShift]);

  useEffect(() => {
    const handleUpdate = () => {
      refreshLogs();
    };
    window.addEventListener('mnsuet_audit_updated', handleUpdate);
    return () => window.removeEventListener('mnsuet_audit_updated', handleUpdate);
  }, []);

  const refreshLogs = () => {
    setLogs(AuditTrailService.getLogs());
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedDept && log.department) {
        const d1 = log.department.toLowerCase();
        const d2 = selectedDept.toLowerCase();
        if (!d1.includes(d2) && !d2.includes(d1)) return false;
      }

      if (selectedProg && log.program) {
        const p1 = log.program.toLowerCase();
        const p2 = selectedProg.toLowerCase();
        if (!p1.includes(p2) && !p2.includes(p1)) return false;
      }

      if (selectedShift && log.shift) {
        if (log.shift.toLowerCase() !== selectedShift.toLowerCase()) return false;
      }

      if (selectedAction !== 'ALL' && log.action !== selectedAction) {
        return false;
      }

      if (selectedTimeRange !== 'ALL') {
        const logTime = new Date(log.timestamp).getTime();
        if (!isNaN(logTime)) {
          const diffMs = Date.now() - logTime;
          if (selectedTimeRange === '12H' && diffMs > 12 * 3600 * 1000) return false;
          if (selectedTimeRange === '24H' && diffMs > 24 * 3600 * 1000) return false;
          if (selectedTimeRange === '48H' && diffMs > 48 * 3600 * 1000) return false;
          if (selectedTimeRange === '3D' && diffMs > 3 * 24 * 3600 * 1000) return false;
          if (selectedTimeRange === '7D' && diffMs > 7 * 24 * 3600 * 1000) return false;
          if (selectedTimeRange === '30D' && diffMs > 30 * 24 * 3600 * 1000) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          log.actorName.toLowerCase().includes(q) ||
          log.summary.toLowerCase().includes(q) ||
          log.actorRole.toLowerCase().includes(q) ||
          log.department.toLowerCase().includes(q) ||
          log.program.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [logs, selectedDept, selectedProg, selectedShift, selectedAction, selectedTimeRange, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  VC Executive Audit Log
                </span>
                <span className="text-xs text-slate-400">• Read-Only Verification</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Audit Trail & Program Change History
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => AuditTrailService.exportCSV()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
            >
              <Download className="w-4 h-4 text-emerald-400" /> Export Audit CSV
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-slate-950/50 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* Department Filter */}
          <div>
            <label className="block text-slate-400 text-[11px] font-bold mb-1">Department</label>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setSelectedProg('');
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value="">All Departments</option>
              {UNIVERSITY_DEPARTMENTS.map((d) => (
                <option key={d.code} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Filter */}
          <div>
            <label className="block text-amber-400/90 text-[11px] font-bold mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" /> Time Window
            </label>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="w-full bg-slate-900 border border-amber-500/30 text-amber-200 font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Time History</option>
              <option value="12H">Last 12 Hours</option>
              <option value="24H">Last 24 Hours (1 Day)</option>
              <option value="48H">Last 48 Hours (2 Days)</option>
              <option value="3D">Last 3 Days</option>
              <option value="7D">Last 7 Days (1 Week)</option>
              <option value="30D">Last 30 Days (1 Month)</option>
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-slate-400 text-[11px] font-bold mb-1">Action Type</label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value="ALL">All Actions</option>
              <option value="CREATED">Created Record</option>
              <option value="UPDATED">Updated Result</option>
              <option value="DELETED">Deleted Record</option>
              <option value="APPROVED">HOD Approved</option>
              <option value="REASSIGNED">Shift / Program Reassigned</option>
            </select>
          </div>

          {/* Shift Filter */}
          <div>
            <label className="block text-slate-400 text-[11px] font-bold mb-1">Shift</label>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value="">All Shifts</option>
              <option value="Morning">Morning Shift</option>
              <option value="Evening">Evening Shift</option>
            </select>
          </div>

          {/* Search Bar */}
          <div>
            <label className="block text-slate-400 text-[11px] font-bold mb-1">Search Keywords</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="User name, code, remark..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>
        </div>

        {/* Modal Body / History List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
              <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">No Change History Entries Found</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Every result upload, modification, or coordinator assignment will be logged here with user IDs and timestamps.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isCreate = log.action === 'CREATED';
              const isUpdate = log.action === 'UPDATED';
              const isDelete = log.action === 'DELETED';
              const isApprove = log.action === 'APPROVED';

              return (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                          isCreate
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : isUpdate
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                            : isDelete
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {log.actorName}
                        <span className="text-[10px] font-normal text-slate-400 font-mono">
                          ({log.actorRole})
                        </span>
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-medium leading-relaxed pl-1">
                    {log.summary}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
                    {log.department && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-500" /> {log.department}
                      </span>
                    )}
                    {log.program && (
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-3 h-3 text-slate-500" /> {log.program}
                      </span>
                    )}
                    {log.shift && (
                      <span className="text-amber-400/90 font-bold">
                        • {log.shift} Shift
                      </span>
                    )}
                    {log.semester && (
                      <span className="text-emerald-400/90">
                        • Sem {log.semester}
                      </span>
                    )}
                    {log.section && (
                      <span className="text-sky-400/90">
                        • Sec {log.section}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing <strong className="text-slate-200">{filteredLogs.length}</strong> change log entries
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
};
