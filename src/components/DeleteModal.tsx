import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  department: string;
  program: string;
  shift?: string;
  session: string;
  semester: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteModal: React.FC<Props> = ({
  isOpen,
  department,
  program,
  shift = 'Morning',
  session,
  semester,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="delete-record-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-rose-200 max-w-md w-full overflow-hidden">
        <div className="bg-rose-50 border-b border-rose-100 p-5 flex items-start gap-4">
          <div className="p-2.5 bg-rose-100 text-rose-700 rounded-full shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900">Delete Program Record?</h3>
            <p className="text-sm text-slate-600 mt-1">
              Are you sure you want to permanently delete this LMS result upload status record from the database?
            </p>
          </div>
          <button
            id="btn-close-delete-modal"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 bg-slate-50 border-b border-slate-200">
          <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Department:</span>
              <span className="text-slate-800 font-semibold text-right">{department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Program:</span>
              <span className="text-emerald-800 font-bold text-right">{program}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Shift:</span>
              <span className="text-indigo-800 font-bold text-right">{shift}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Session / Semester:</span>
              <span className="text-slate-800 font-medium text-right">
                Session {session} – Semester {semester}
              </span>
            </div>
          </div>
          <p className="text-xs text-rose-600 mt-3 flex items-center gap-1.5 font-medium">
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            This action only removes this specific program and shift record. Other shifts/programs are unaffected.
          </p>
        </div>

        <div className="p-4 bg-white flex items-center justify-end gap-3">
          <button
            id="btn-cancel-delete"
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-300"
          >
            CANCEL
          </button>
          <button
            id="btn-confirm-delete"
            type="button"
            onClick={onConfirm}
            className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg transition-colors shadow-xs flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            DELETE RECORD
          </button>
        </div>
      </div>
    </div>
  );
};
