import React from 'react';
import {
  Shield,
  GraduationCap,
  Building,
  CheckCircle2,
  X,
  ArrowRight,
  Eye,
  Lock,
  Users,
  Database,
  History,
  AlertCircle,
  FileSpreadsheet,
  Check,
  Send,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreviewMode?: (mode: 'HOD' | 'COORDINATOR' | 'OFF') => void;
}

export const RolePerspectiveComparisonModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectPreviewMode,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Role Perspective &amp; Portal Architecture Guide</span>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded uppercase font-mono tracking-wider font-extrabold">
                  Admin System Reference
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Comparison of features, permissions, visual indicators, and access boundaries between Head of Department (HOD) and Program Coordinator views.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Quick Simulation Banner */}
          {onSelectPreviewMode && (
            <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Eye className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-xs">
                    Live Interface Simulator
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    Switch your active admin session into authentic HOD or Coordinator preview mode right now.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onSelectPreviewMode('HOD');
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Preview HOD View</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectPreviewMode('COORDINATOR');
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Preview Coordinator View</span>
                </button>
              </div>
            </div>
          )}

          {/* Side-by-Side Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. HOD Page Column */}
            <div className="bg-slate-50 dark:bg-slate-850/80 border-2 border-emerald-500/30 rounded-xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Head of Department (HOD) Page</span>
                      </h3>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                        Department-Wide Academic Authority
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    ROLE: HOD
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Key Features &amp; Capabilities</span>
                  </div>
                  <ul className="space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <li className="flex items-start gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900 dark:text-white">Department Isolation:</strong> Locked to their own academic department (e.g. Mechanical Engineering) with a prominent <em>"Department Isolation Active"</em> badge.
                      </div>
                    </li>
                    <li className="flex items-start gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900 dark:text-white">Full Program Dropdown:</strong> Can freely switch and inspect all department degree programs (BS, MS, Ph.D.), shifts (Morning/Evening), and sections (A, B, C).
                      </div>
                    </li>
                    <li className="flex items-start gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900 dark:text-white">Faculty &amp; Coordinator Delegation:</strong> Access to the <em>"Coordinators &amp; Faculty"</em> management modal to reallocate programs, approve pending coordinators, or shift visiting lecturers.
                      </div>
                    </li>
                    <li className="flex items-start gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <Shield className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900 dark:text-white">Official HOD Sign-Off &amp; Overrides:</strong> Any modification saved by an HOD is stamped with <em>hodLastModifiedBy</em> and logged with the official HOD audit tag.
                      </div>
                    </li>
                    <li className="flex items-start gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <Send className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900 dark:text-white">Review &amp; Approve Additional Program Requests:</strong> Receives petitions from coordinators wanting to access secondary degree programs.
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              {onSelectPreviewMode && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectPreviewMode('HOD');
                    onClose();
                  }}
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Launch Live HOD View</span>
                </button>
              )}
            </div>

            {/* 2. Coordinator Page Column */}
            <div className="bg-slate-50 dark:bg-slate-850/80 border-2 border-teal-500/30 rounded-xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Program Coordinator Page</span>
                      </h3>
                      <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400">
                        Designated Program Isolation &amp; Course Entry
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
                    ROLE: COORDINATOR
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    <span>Key Features &amp; Capabilities</span>
                  </div>
                  <ul className="space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <li className="flex items-start gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <Lock className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900 dark:text-white">Strict Program Isolation:</strong> Displays <em>"Coordinated Program: [Name]"</em> badge. Restricted exclusively to their allocated degree programs.
                      </div>
                    </li>
                    <li className="flex items-start gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <Shield className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900 dark:text-white">HOD Update Notification Banner:</strong> When an HOD edits or updates their course matrix, a purple gradient banner appears with full timestamp details and a <em>"View HOD Audit Logs"</em> button.
                      </div>
                    </li>
                    <li className="flex items-start gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <Send className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900 dark:text-white">Request Additional Program Tool:</strong> A dedicated modal to request permission from the HOD for additional degree programs if teaching/coordinating across multiple curricula.
                      </div>
                    </li>
                    <li className="flex items-start gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900 dark:text-white">Course Upload &amp; Operations Matrix:</strong> Real-time status toggles, Excel import/export, Quick Fill faculty names, Batch Delete, and 0-course saving support.
                      </div>
                    </li>
                    <li className="flex items-start gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <History className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900 dark:text-white">Change History Modal:</strong> Accessible on every sheet with color-coded history logs and official HOD badges.
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              {onSelectPreviewMode && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectPreviewMode('COORDINATOR');
                    onClose();
                  }}
                  className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Launch Live Coordinator View</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 dark:bg-slate-850 p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            System Admin retains full authority across all departments, database tools, and user accounts.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-lg text-xs transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
