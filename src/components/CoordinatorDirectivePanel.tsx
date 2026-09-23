import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, Clock, ShieldAlert, AlertCircle, Sparkles, MessageSquare, CornerDownRight, X, Megaphone } from 'lucide-react';
import { DirectiveService, InstitutionalDirective } from '../services/directiveService';
import { SendFacultyReminderModal } from './SendFacultyReminderModal';

interface Props {
  departmentName?: string;
  programName?: string;
  currentUser?: {
    name: string;
    email?: string;
    role: string;
  };
  onNavigateToCourse?: () => void;
}

export const CoordinatorDirectivePanel: React.FC<Props> = ({
  departmentName = '',
  programName = '',
  currentUser,
  onNavigateToCourse
}) => {
  const [directives, setDirectives] = useState<InstitutionalDirective[]>([]);
  const [selectedToResolve, setSelectedToResolve] = useState<InstitutionalDirective | null>(null);
  const [completionNote, setCompletionNote] = useState<string>('LMS course result sheets uploaded and verified successfully.');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState<boolean>(false);

  const loadDirectives = () => {
    if (!departmentName) return;
    const list = DirectiveService.getDirectivesForCoordinator(
      departmentName,
      programName,
      currentUser?.email
    );
    setDirectives(list);
  };

  useEffect(() => {
    loadDirectives();
    window.addEventListener('mnsuet_directives_updated', loadDirectives);
    return () => {
      window.removeEventListener('mnsuet_directives_updated', loadDirectives);
    };
  }, [departmentName, programName]);

  const handleResolveDirective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedToResolve) return;

    const resolvedByName = `${currentUser?.name || 'Program Coordinator'} (${programName || 'Coordinator'})`;
    const success = DirectiveService.resolveDirective(
      selectedToResolve.id,
      resolvedByName,
      completionNote
    );

    if (success) {
      setSuccessToast('Directive marked as Completed! HOD and VC have been notified.');
      setTimeout(() => setSuccessToast(null), 4000);
      setSelectedToResolve(null);
      loadDirectives();
    }
  };

  const activeForCoordinator = directives.filter(d => d.status === 'FORWARDED' || d.status === 'OPEN');

  if (activeForCoordinator.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {successToast && (
        <div className="p-3 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-white hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Coordinator Urgent Action Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-500/40 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-indigo-800/40 pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/30 border border-indigo-400/40 rounded-xl text-indigo-300">
              <MessageSquare className="w-5 h-5 text-indigo-300 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black tracking-wide text-white uppercase">
                  Pending Task Directive from HOD &amp; VC
                </h3>
                <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full uppercase">
                  {activeForCoordinator.length} Pending
                </span>
              </div>
              <p className="text-[11px] text-indigo-200">
                Mandatory LMS Upload Orders assigned to you by Head of Department
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsReminderModalOpen(true)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Megaphone className="w-3.5 h-3.5 animate-pulse text-amber-200" />
            <span>Remind Instructors</span>
          </button>
        </div>

        <div className="space-y-3">
          {activeForCoordinator.map((dir) => (
            <div
              key={dir.id}
              className="p-3.5 bg-slate-900/90 rounded-xl border border-indigo-500/30 text-white space-y-2.5 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black bg-rose-600 text-white px-2 py-0.5 rounded uppercase">
                    {dir.priority} Priority
                  </span>
                  <strong className="text-xs font-bold text-white">{dir.title}</strong>
                </div>
                <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Deadline: {dir.deadline}
                </span>
              </div>

              {/* Message from HOD */}
              {dir.forwardedByHOD && (
                <div className="p-2.5 bg-indigo-950/60 border border-indigo-800/50 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-indigo-300 font-bold">
                    <span>Message from HOD ({dir.forwardedByHOD.hodName}):</span>
                    <span>{new Date(dir.forwardedByHOD.forwardedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-slate-200 font-medium italic">"{dir.forwardedByHOD.noteToCoordinator}"</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <span className="text-[10px] text-slate-400">Target: <strong className="text-indigo-300">{dir.targetProgram || dir.targetDepartment}</strong></span>
                <button
                  type="button"
                  onClick={() => setSelectedToResolve(dir)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider shadow-md hover:shadow-emerald-500/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Task Completed</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: Mark Task Completed */}
      {selectedToResolve && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-white animate-scale-up">
            <div className="bg-emerald-900/60 px-5 py-4 border-b border-emerald-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black uppercase text-white">
                  Resolve &amp; Confirm Directive Task
                </h3>
              </div>
              <button
                onClick={() => setSelectedToResolve(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveDirective} className="p-5 space-y-4">
              <p className="text-xs text-slate-300">
                You are marking directive <strong className="text-white">"{selectedToResolve.title}"</strong> as <strong>COMPLETED</strong>. This notification will be sent immediately to Head of Department and VC Office.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase block">
                  Completion / Verification Note
                </label>
                <textarea
                  rows={3}
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  placeholder="Details of uploaded course results..."
                  required
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedToResolve(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl uppercase tracking-wider shadow-lg shadow-emerald-600/30"
                >
                  Confirm Completion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Faculty Upload Reminder Modal */}
      <SendFacultyReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        currentUser={currentUser ? {
          id: currentUser.email || 'coord',
          username: currentUser.email || 'coord',
          password: '',
          name: currentUser.name,
          email: currentUser.email,
          department: departmentName,
          designation: 'Program Coordinator',
          role: currentUser.role as any,
          program: programName,
          createdAt: new Date().toISOString()
        } : null}
        defaultDepartment={departmentName}
        defaultProgram={programName}
        onSuccess={() => {
          setSuccessToast('Reminder dispatched to program faculty members!');
          setTimeout(() => setSuccessToast(null), 4000);
        }}
      />
    </div>
  );
};
