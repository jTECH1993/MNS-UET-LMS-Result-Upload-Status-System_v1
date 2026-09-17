import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Check,
  X,
  Sparkles,
  SlidersHorizontal,
  Info,
  Layers,
  CheckSquare,
  Square,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { StorageService } from '../services/storageService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentSession: string;
  onSessionSelect?: (newSession: string) => void;
  onSessionChanged?: (newSession: string) => void;
  onActiveSessionsChanged?: (sessions: string[]) => void;
}

export const AcademicSessionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentSession,
  onSessionSelect,
  onSessionChanged,
  onActiveSessionsChanged,
}) => {
  const [sessions, setSessions] = useState<string[]>(() => StorageService.getAvailableSessions());
  const [activeSessions, setActiveSessionsState] = useState<string[]>(() =>
    StorageService.getActiveSessions()
  );
  const [isMultiMode, setIsMultiMode] = useState<boolean>(() => activeSessions.length > 1);
  const [newSessionInput, setNewSessionInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  // Single click immediate selection
  const handleSingleSelect = (s: string) => {
    StorageService.setSelectedSession(s);
    StorageService.setActiveSessions([s]);
    setActiveSessionsState([s]);
    if (onSessionSelect) onSessionSelect(s);
    if (onSessionChanged) onSessionChanged(s);
    if (onActiveSessionsChanged) onActiveSessionsChanged([s]);
    setSuccessMsg(`Active session set to Session ${s}`);
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 450);
  };

  // Toggle session in multi-session mode
  const handleToggleSession = (s: string) => {
    let updated: string[];
    if (activeSessions.includes(s)) {
      if (activeSessions.length === 1) {
        setErrorMsg('At least one academic session must remain active.');
        return;
      }
      updated = activeSessions.filter((x) => x !== s);
    } else {
      updated = [...activeSessions, s];
    }
    setErrorMsg('');
    setActiveSessionsState(updated);
  };

  // Select all sessions
  const handleSelectAll = () => {
    setActiveSessionsState([...sessions]);
    setErrorMsg('');
  };

  // Select 2023 only
  const handleResetTo2023 = () => {
    setActiveSessionsState(['2023']);
    setErrorMsg('');
  };

  // Apply multi-session changes
  const handleApplyMultiSessions = () => {
    if (activeSessions.length === 0) {
      setErrorMsg('Please select at least one active session.');
      return;
    }
    StorageService.setActiveSessions(activeSessions);
    const primary = activeSessions[0];
    if (onSessionSelect) onSessionSelect(primary);
    if (onSessionChanged) onSessionChanged(primary);
    if (onActiveSessionsChanged) onActiveSessionsChanged(activeSessions);
    setSuccessMsg(`Successfully activated ${activeSessions.length} academic session(s)!`);
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 550);
  };

  // Add new session
  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newSessionInput.trim();
    if (!clean) {
      setErrorMsg('Please enter a valid session year or batch (e.g. 2025, 2026, 2024-2028).');
      return;
    }
    if (sessions.includes(clean)) {
      setErrorMsg(`Session "${clean}" is already in the university roster.`);
      return;
    }

    const updated = StorageService.addAcademicSession(clean);
    setSessions(updated);
    setNewSessionInput('');
    setErrorMsg('');

    if (isMultiMode) {
      const nextActive = [...activeSessions, clean];
      setActiveSessionsState(nextActive);
      setSuccessMsg(`Added and activated Session ${clean}`);
    } else {
      handleSingleSelect(clean);
    }
  };

  return (
    <div
      id="academic-session-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="session-modal-dialog"
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="bg-emerald-900 dark:bg-emerald-950 px-6 py-4 text-white flex items-center justify-between shrink-0 border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 dark:bg-emerald-900 flex items-center justify-center text-emerald-300">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Academic Session Manager</h2>
              <p className="text-xs text-emerald-200">
                Single or Multi-Session Monitoring • Select or Add Custom Batch
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Mode Switcher Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {isMultiMode ? 'Multi-Session Monitoring Mode' : 'Single Session Mode'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isMultiMode
                    ? 'Aggregate statistics across multiple batches simultaneously'
                    : 'Focus strictly on one specific session batch'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !isMultiMode;
                setIsMultiMode(next);
                if (!next && activeSessions.length > 1) {
                  setActiveSessionsState([activeSessions[0]]);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer shrink-0 flex items-center gap-1.5 ${
                isMultiMode
                  ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:border-emerald-500'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isMultiMode ? '✓ Multi-Session Active' : 'Switch to Multi-Session'}</span>
            </button>
          </div>

          {/* Quick Actions for Multi-Session Mode */}
          {isMultiMode && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{activeSessions.length} Active Session(s) Selected:</span>
              </span>
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleResetTo2023}
                  className="px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  2023 Only
                </button>
              </div>
            </div>
          )}

          {/* Sessions Selection Grid */}
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {sessions.map((sess) => {
                const isActive = activeSessions.includes(sess);
                const isPrimary = currentSession === sess;

                if (!isMultiMode) {
                  return (
                    <button
                      key={sess}
                      type="button"
                      onClick={() => handleSingleSelect(sess)}
                      className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                        isPrimary
                          ? 'bg-emerald-800 text-white border-emerald-900 shadow-md ring-2 ring-emerald-500 ring-offset-1'
                          : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <span className="text-sm sm:text-base font-black tracking-tight">Session {sess}</span>
                      <span
                        className={`text-[10px] mt-0.5 font-medium ${
                          isPrimary ? 'text-emerald-200 font-bold' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {isPrimary ? '● Currently Active' : 'Click to Select'}
                      </span>
                    </button>
                  );
                }

                // Multi-Session Mode Card with Checkbox
                return (
                  <div
                    key={sess}
                    onClick={() => handleToggleSession(sess)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer select-none flex flex-col justify-between ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-600 dark:border-emerald-700 shadow-xs ring-1 ring-emerald-500/40'
                        : 'bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] shrink-0 ${
                            isActive
                              ? 'bg-emerald-700 text-white border-emerald-800 font-black'
                              : 'border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-850'
                          }`}
                        >
                          {isActive && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                          Session {sess}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-semibold mt-1 inline-block ${
                        isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'
                      }`}
                    >
                      {isActive ? '✓ Monitoring Active' : 'Inactive'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Sessions Summary Chips in Multi Mode */}
          {isMultiMode && (
            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                  Active in University Portal:
                </span>
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700">
                  {activeSessions.length} Batch(es)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {activeSessions.map((s) => (
                  <span
                    key={s}
                    className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-800 text-white inline-flex items-center gap-1 shadow-2xs"
                  >
                    <span>Session {s}</span>
                    {activeSessions.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSession(s);
                        }}
                        className="hover:text-rose-300 p-0.5"
                        title="Remove session"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-snug">
                Portal dashboards, status cards, and Excel/CSV exports will combine result logs from all checked sessions.
              </p>
            </div>
          )}

          {/* Add New Custom Session Form */}
          <form onSubmit={handleAddNew} className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Add Custom Academic Session</span>
              <span className="text-[10px] text-slate-400 font-normal">e.g. 2025, 2026, 2024-2028</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSessionInput}
                onChange={(e) => {
                  setNewSessionInput(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Enter new batch/session (e.g. 2025)"
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Session
              </button>
            </div>
            {errorMsg && <p className="text-xs text-rose-600 font-medium mt-1">{errorMsg}</p>}
            {successMsg && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> {successMsg}
              </p>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-850 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {isMultiMode ? (
              <>Active: <strong>{activeSessions.join(', ')}</strong></>
            ) : (
              <>Current: <strong>Session {currentSession}</strong></>
            )}
          </span>
          <div className="flex items-center gap-2">
            {isMultiMode ? (
              <button
                type="button"
                onClick={handleApplyMultiSessions}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Apply Active Sessions
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
