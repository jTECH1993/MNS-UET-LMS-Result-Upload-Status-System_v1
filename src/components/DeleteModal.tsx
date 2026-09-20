import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert, Layers, Building2, CheckCircle2 } from 'lucide-react';

export type DeleteScope = 'CURRENT_SECTION' | 'ENTIRE_PROGRAM' | 'ENTIRE_DEPARTMENT' | 'ALL_SYSTEM';

interface Props {
  isOpen: boolean;
  department: string;
  program: string;
  shift?: string;
  section?: string;
  session: string;
  semester: string;
  isHodOrAdmin?: boolean;
  onCancel: () => void;
  onConfirm: (scope: DeleteScope) => void;
}

export const DeleteModal: React.FC<Props> = ({
  isOpen,
  department,
  program,
  shift = 'Morning',
  section = 'A',
  session,
  semester,
  isHodOrAdmin = false,
  onCancel,
  onConfirm,
}) => {
  const [selectedScope, setSelectedScope] = useState<DeleteScope>('CURRENT_SECTION');
  const [confirmedText, setConfirmedText] = useState<string>('');

  if (!isOpen) return null;

  const needsTextConfirmation = selectedScope === 'ENTIRE_PROGRAM' || selectedScope === 'ENTIRE_DEPARTMENT' || selectedScope === 'ALL_SYSTEM';
  const expectedKeyword = selectedScope === 'ALL_SYSTEM' ? 'DELETE ALL' : 'DELETE';
  const isConfirmDisabled = needsTextConfirmation && confirmedText.trim().toUpperCase() !== expectedKeyword;

  const handleConfirmAction = () => {
    if (isConfirmDisabled) return;
    onConfirm(selectedScope);
  };

  return (
    <div
      id="delete-record-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-rose-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-rose-50 border-b border-rose-100 p-4 sm:p-5 flex items-start gap-3.5">
          <div className="p-2.5 bg-rose-100 text-rose-700 rounded-full shrink-0 shadow-inner">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              Delete LMS Submission Data
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Confirm your deletion target. This operation is recorded in the university audit trail.
            </p>
          </div>
          <button
            id="btn-close-delete-modal"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/70">
          {/* Scope Selection Selector (If HOD/Admin has multiple deletion options) */}
          {isHodOrAdmin && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Choose Deletion Scope:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedScope('CURRENT_SECTION')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                    selectedScope === 'CURRENT_SECTION'
                      ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300 shadow-2xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Trash2 className={`w-4 h-4 mt-0.5 shrink-0 ${selectedScope === 'CURRENT_SECTION' ? 'text-rose-600' : 'text-slate-400'}`} />
                  <div>
                    <span className="block text-xs font-bold text-slate-900">Current Offering Only</span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      Sem {semester} ({shift} - Sec {section})
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedScope('ENTIRE_PROGRAM')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                    selectedScope === 'ENTIRE_PROGRAM'
                      ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300 shadow-2xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Layers className={`w-4 h-4 mt-0.5 shrink-0 ${selectedScope === 'ENTIRE_PROGRAM' ? 'text-rose-600' : 'text-slate-400'}`} />
                  <div>
                    <span className="block text-xs font-bold text-slate-900">Entire Program</span>
                    <span className="block text-[11px] text-slate-500 mt-0.5 truncate">
                      All shifts &amp; semesters of {program}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Details Box */}
          <div className="bg-white p-3.5 sm:p-4 rounded-lg border border-slate-200 shadow-2xs space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-100 pb-1.5">
              <span className="text-slate-500 font-medium">Department:</span>
              <span className="text-slate-800 font-semibold text-right">{department}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-100 pb-1.5">
              <span className="text-slate-500 font-medium">Program:</span>
              <span className="text-emerald-800 font-bold text-right">{program}</span>
            </div>
            {selectedScope === 'CURRENT_SECTION' ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500 font-medium">Shift &amp; Section:</span>
                  <span className="text-indigo-800 font-bold text-right">{shift} – Section {section}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-slate-500 font-medium">Session &amp; Semester:</span>
                  <span className="text-slate-800 font-medium text-right">
                    Session {session} – Semester {semester}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-slate-500 font-medium">Target Scope:</span>
                <span className="text-rose-700 font-bold text-right">
                  All semesters, shifts, and sections for {program}
                </span>
              </div>
            )}
          </div>

          {/* Impact Warning Notice */}
          <div className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
            selectedScope === 'CURRENT_SECTION'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}>
            <ShieldAlert className={`w-4 h-4 mt-0.5 shrink-0 ${selectedScope === 'CURRENT_SECTION' ? 'text-amber-600' : 'text-rose-600'}`} />
            <div>
              <p className="font-semibold">
                {selectedScope === 'CURRENT_SECTION'
                  ? `This will remove the saved LMS record for ${program} (${shift} Shift - Sem ${semester} Sec ${section}).`
                  : `This will permanently remove ALL saved submission records for ${program} across all academic shifts and semesters.`}
              </p>
              <p className="text-[11px] mt-0.5 opacity-90">
                User accounts, faculty profiles, and departmental configurations remain intact.
              </p>
            </div>
          </div>

          {/* Verification confirmation input for broad program/department deletions */}
          {needsTextConfirmation && (
            <div className="bg-white p-3 rounded-lg border border-rose-200 space-y-1.5">
              <label htmlFor="confirm-delete-text" className="block text-xs font-bold text-rose-900">
                Type <span className="font-mono bg-rose-100 px-1 py-0.5 rounded text-rose-800">{expectedKeyword}</span> to confirm:
              </label>
              <input
                id="confirm-delete-text"
                type="text"
                value={confirmedText}
                onChange={(e) => setConfirmedText(e.target.value)}
                placeholder={expectedKeyword}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 uppercase tracking-widest"
                autoComplete="off"
              />
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-end gap-2.5">
          <button
            id="btn-cancel-delete"
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-300 cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="btn-confirm-delete"
            type="button"
            onClick={handleConfirmAction}
            disabled={isConfirmDisabled}
            className={`px-5 py-2 text-xs sm:text-sm font-bold text-white rounded-lg transition-all shadow-xs flex items-center gap-2 cursor-pointer ${
              isConfirmDisabled
                ? 'bg-rose-300 cursor-not-allowed'
                : 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>
              {selectedScope === 'CURRENT_SECTION' ? 'Delete Section Record' : 'Delete All Program Records'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
