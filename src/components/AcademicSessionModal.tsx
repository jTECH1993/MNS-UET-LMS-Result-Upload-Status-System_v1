import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Check,
  X,
  Sparkles,
  SlidersHorizontal,
  Info,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { StorageService } from '../services/storageService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentSession: string;
  onSessionSelect?: (newSession: string) => void;
  onSessionChanged?: (newSession: string) => void;
}

export const AcademicSessionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentSession,
  onSessionSelect,
  onSessionChanged,
}) => {
  const [sessions, setSessions] = useState<string[]>(() => StorageService.getAvailableSessions());
  const [newSessionInput, setNewSessionInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSelect = (s: string) => {
    StorageService.setSelectedSession(s);
    if (onSessionSelect) onSessionSelect(s);
    if (onSessionChanged) onSessionChanged(s);
    setSuccessMsg(`Active session switched to ${s}`);
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 450);
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newSessionInput.trim();
    if (!clean) {
      setErrorMsg('Please enter a valid session year or batch (e.g. 2024, 2025, 2023-2027).');
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
    handleSelect(clean);
  };

  return (
    <div
      id="academic-session-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="session-modal-dialog"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-emerald-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 flex items-center justify-center text-emerald-300">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Academic Session Selector</h2>
              <p className="text-xs text-emerald-200">
                Generic Academic Cycle Management • Select or Add Custom Batch
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-900">
              This system is <strong>fully generic</strong>. Selecting any session (e.g.{' '}
              <strong>Session 2023</strong> or <strong>Session 2024</strong>) switches the entire
              monitoring workspace and HOD entry sheets to that specific academic cohort.
            </p>
          </div>

          {/* Current Active Session */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Available University Sessions
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {sessions.map((sess) => {
                const isActive = sess === currentSession;
                return (
                  <button
                    key={sess}
                    type="button"
                    onClick={() => handleSelect(sess)}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                      isActive
                        ? 'bg-emerald-800 text-white border-emerald-900 shadow-md ring-2 ring-emerald-500 ring-offset-1'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300'
                    }`}
                  >
                    <span className="text-base font-black tracking-tight">Session {sess}</span>
                    <span
                      className={`text-[10px] mt-0.5 font-medium ${
                        isActive ? 'text-emerald-200 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {isActive ? '● Currently Active' : 'Click to Activate'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add New Session Form */}
          <form onSubmit={handleAddNew} className="pt-2 border-t border-slate-200">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Add New Academic Session</span>
              <span className="text-[10px] text-slate-400 font-normal">e.g. 2025, 2026</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSessionInput}
                onChange={(e) => {
                  setNewSessionInput(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Enter new session (e.g. 2025)"
                className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add & Activate
              </button>
            </div>
            {errorMsg && <p className="text-xs text-rose-600 font-medium mt-1">{errorMsg}</p>}
            {successMsg && (
              <p className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> {successMsg}
              </p>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Active Cycle: <strong>Session {currentSession}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
