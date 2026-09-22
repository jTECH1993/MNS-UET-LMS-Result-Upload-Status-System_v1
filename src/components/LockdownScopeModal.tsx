import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Calendar,
  Layers,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { FirebaseStore } from '../lib/firebaseStore';
import { LockdownAnalyticsSection } from './LockdownAnalyticsSection';

interface LockdownScopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSession?: string;
  initialSemester?: string;
  onScopeUpdated?: () => void;
}

export const LockdownScopeModal: React.FC<LockdownScopeModalProps> = ({
  isOpen,
  onClose,
  initialSession = '2023',
  initialSemester = '1',
  onScopeUpdated,
}) => {
  const [activeModalTab, setActiveModalTab] = useState<'configure' | 'analytics'>('configure');
  const [selectedSession, setSelectedSession] = useState<string>(initialSession);
  const [selectedSemester, setSelectedSemester] = useState<string>(initialSemester);
  const [actionType, setActionType] = useState<'ENFORCE_LOCK' | 'LIFT_LOCK'>('ENFORCE_LOCK');
  const [applyToAllSemesters, setApplyToAllSemesters] = useState<boolean>(initialSemester === 'ALL');
  const [customDeadline, setCustomDeadline] = useState<string>('');
  const [includeCustomDeadline, setIncludeCustomDeadline] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyScopeLockdown = async () => {
    setIsSubmitting(true);
    const turnDisabled = actionType === 'LIFT_LOCK'; // true = unlock, false = lock
    const scopeSemester = applyToAllSemesters ? 'ALL' : selectedSemester;

    try {
      // 1. Update Lockdown state for specific scope
      StorageService.setLockdownDisabled(
        turnDisabled,
        selectedSession,
        scopeSemester,
        applyToAllSemesters
      );

      // 2. Set Custom Deadline if specified
      if (includeCustomDeadline && customDeadline) {
        const isoDate = new Date(customDeadline).toISOString();
        StorageService.setSystemDeadline(
          isoDate,
          selectedSession,
          scopeSemester,
          applyToAllSemesters
        );
      }

      const scopeText = applyToAllSemesters
        ? `Session ${selectedSession} (All Semesters)`
        : `Session ${selectedSession} (Semester ${selectedSemester})`;

      const statusText = turnDisabled ? 'UNLOCKED (Lockdown Lifted)' : 'LOCKED (Lockdown Enforced)';
      setSuccessMessage(`Lockdown status updated for ${scopeText} -> ${statusText}`);

      if (onScopeUpdated) {
        onScopeUpdated();
      }

      setTimeout(() => {
        setIsSubmitting(false);
        setSuccessMessage(null);
        onClose();
      }, 1200);
    } catch (e) {
      console.error('Error applying lockdown scope:', e);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`relative w-full ${activeModalTab === 'analytics' ? 'max-w-4xl' : 'max-w-lg'} rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-slate-100 transition-all duration-300`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4 flex flex-wrap items-center justify-between text-white border-b border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 border border-indigo-500/30 rounded-xl">
              {activeModalTab === 'analytics' ? (
                <BarChart3 className="h-5 w-5 text-indigo-400" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-indigo-400" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">System Lockdown Scope Controller</h3>
              <p className="text-xs text-indigo-200/80 font-medium">
                Link lockdown rules dynamically to specific sessions & semesters
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Modal Navigation Tab Switcher */}
            <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-700/80 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveModalTab('configure')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeModalTab === 'configure'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Configure</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('analytics')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeModalTab === 'analytics'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Analytics</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-sm max-h-[80vh] overflow-y-auto">
          {successMessage ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center gap-3 animate-in zoom-in-95">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="font-semibold text-xs leading-relaxed">{successMessage}</p>
            </div>
          ) : activeModalTab === 'analytics' ? (
            <LockdownAnalyticsSection
              currentSession={selectedSession}
              currentSemester={selectedSemester}
            />
          ) : (
            <>
              {/* Scope Selector: Action Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Select Lockdown Action Directive</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setActionType('ENFORCE_LOCK')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                      actionType === 'ENFORCE_LOCK'
                        ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/30'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <Lock className="w-4 h-4 text-rose-500" />
                    <span>Enforce Lockdown (Seal Entries)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType('LIFT_LOCK')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                      actionType === 'LIFT_LOCK'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <Unlock className="w-4 h-4 text-emerald-500" />
                    <span>Lift Lockdown (Unlock Entries)</span>
                  </button>
                </div>
              </div>

              {/* Target Academic Session */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Target Academic Session</span>
                </label>
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="2023">Session 2023 (Primary Active)</option>
                  <option value="2024">Session 2024</option>
                  <option value="2022">Session 2022</option>
                  <option value="2021">Session 2021</option>
                  <option value="2020">Session 2020</option>
                </select>
              </div>

              {/* Target Semester Option */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Target Semester Constraint</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                    <input
                      type="checkbox"
                      checked={applyToAllSemesters}
                      onChange={(e) => setApplyToAllSemesters(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Apply to ALL Semesters (1–8)</span>
                  </label>
                </div>

                {!applyToAllSemesters && (
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={String(s)}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Optional Custom Deadline Setter */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={includeCustomDeadline}
                    onChange={(e) => setIncludeCustomDeadline(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Set Expiration Countdown Deadline for this Scope</span>
                </label>

                {includeCustomDeadline && (
                  <input
                    type="datetime-local"
                    value={customDeadline}
                    onChange={(e) => setCustomDeadline(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              {/* Selected Scope Preview Banner */}
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
                <span className="font-semibold">Active Scope Directive:</span>
                <span className="font-bold font-mono bg-indigo-100 dark:bg-indigo-900/80 px-2 py-0.5 rounded text-indigo-700 dark:text-indigo-300">
                  [{selectedSession} | {applyToAllSemesters ? 'All Semesters (1–8)' : `Semester ${selectedSemester}`}]
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer Buttons */}
        {!successMessage && (
          <div className="bg-slate-100 dark:bg-slate-800/80 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
            {activeModalTab === 'analytics' ? (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors cursor-pointer"
              >
                Done
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyScopeLockdown}
                  disabled={isSubmitting}
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer flex items-center gap-2 ${
                    actionType === 'ENFORCE_LOCK'
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  }`}
                >
                  {actionType === 'ENFORCE_LOCK' ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Enforce Scope Lockdown</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Lift Scope Lockdown</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
