import React, { useState, useEffect } from 'react';
import { Send, MessageSquare, AlertTriangle, CheckCircle2, Clock, ShieldAlert, UserCheck, ArrowRight, CornerDownRight, X, Sparkles } from 'lucide-react';
import { DirectiveService, InstitutionalDirective } from '../services/directiveService';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import { UserAccount } from '../types';
import { AuthService } from '../services/authService';

interface Props {
  departmentName: string;
  currentUser?: {
    name: string;
    email?: string;
    role: string;
  };
  onNavigateToProgram?: (program: string, sem?: string) => void;
}

export const HODDirectivePanel: React.FC<Props> = ({
  departmentName,
  currentUser,
  onNavigateToProgram,
}) => {
  const [directives, setDirectives] = useState<InstitutionalDirective[]>([]);
  const [selectedDirectiveToForward, setSelectedDirectiveToForward] = useState<InstitutionalDirective | null>(null);
  
  // Forward modal states
  const [availableCoordinators, setAvailableCoordinators] = useState<UserAccount[]>([]);
  const [selectedCoordinatorEmail, setSelectedCoordinatorEmail] = useState<string>('');
  const [customNote, setCustomNote] = useState<string>('');
  const [isSuccessToast, setIsSuccessToast] = useState<string | null>(null);

  const loadDirectives = () => {
    if (!departmentName) return;
    const items = DirectiveService.getDirectivesForDepartment(departmentName);
    setDirectives(items);
  };

  useEffect(() => {
    loadDirectives();
    window.addEventListener('mnsuet_directives_updated', loadDirectives);
    return () => {
      window.removeEventListener('mnsuet_directives_updated', loadDirectives);
    };
  }, [departmentName]);

  // Load registered coordinators for this department
  useEffect(() => {
    if (!departmentName) return;
    const allUsers = AuthService.getAccounts();
    const deptCoordinators = allUsers.filter((u: UserAccount) => 
      u.role === 'COORDINATOR' && 
      u.department && 
      (u.department.toLowerCase().trim() === departmentName.toLowerCase().trim() ||
       departmentName.toLowerCase().includes(u.department.toLowerCase().replace('department of', '').trim()))
    );
    setAvailableCoordinators(deptCoordinators);
    if (deptCoordinators.length > 0) {
      setSelectedCoordinatorEmail(deptCoordinators[0].email || '');
    }
  }, [departmentName]);

  const handleOpenForwardModal = (directive: InstitutionalDirective) => {
    setSelectedDirectiveToForward(directive);
    setCustomNote(`Engr. Sahib, kindly ensure LMS result upload for this task as requested by Vice Chancellor Office.`);
  };

  const handleDispatchToCoordinator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDirectiveToForward) return;

    const coordObj = availableCoordinators.find(c => c.email === selectedCoordinatorEmail);
    const coordName = coordObj ? coordObj.name : 'Program Coordinator';

    const success = DirectiveService.forwardDirectiveToCoordinator(
      selectedDirectiveToForward.id,
      currentUser?.name || 'Head of Department',
      currentUser?.email,
      coordName,
      selectedCoordinatorEmail,
      customNote
    );

    if (success) {
      setIsSuccessToast(`Directive successfully forwarded to ${coordName}!`);
      setTimeout(() => setIsSuccessToast(null), 4000);
      setSelectedDirectiveToForward(null);
      loadDirectives();
    }
  };

  // Unresolved directives for this HOD
  const activeDirectives = directives.filter(d => d.status !== 'RESOLVED');

  if (directives.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {isSuccessToast && (
        <div className="p-3 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSuccessToast}</span>
          </div>
          <button onClick={() => setIsSuccessToast(null)} className="text-white hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* VC Directive Dispatch Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-xl p-4 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-indigo-500/5 pointer-events-none transform skew-x-12" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-800/40 pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/30 border border-indigo-400/40 rounded-lg text-indigo-300">
              <ShieldAlert className="w-5 h-5 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black tracking-wide text-white uppercase">
                  VC Executive Directives &amp; Action Orders
                </h3>
                <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full uppercase">
                  {activeDirectives.length} Active
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Official mandates issued by Vice Chancellor Office for {departmentName}
              </p>
            </div>
          </div>
        </div>

        {/* Directives List */}
        <div className="space-y-3">
          {directives.map((dir) => (
            <div
              key={dir.id}
              className={`p-3.5 rounded-lg border transition-all ${
                dir.status === 'RESOLVED'
                  ? 'bg-slate-800/40 border-slate-700/50 text-slate-400'
                  : dir.status === 'FORWARDED'
                  ? 'bg-indigo-950/40 border-indigo-500/40 text-slate-200'
                  : 'bg-rose-950/30 border-rose-500/50 text-white ring-1 ring-rose-500/30'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                      dir.priority === 'CRITICAL'
                        ? 'bg-rose-600 text-white'
                        : dir.priority === 'HIGH'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-sky-500 text-slate-950'
                    }`}
                  >
                    {dir.priority} Directive
                  </span>
                  <span className="text-xs font-bold text-indigo-200">{dir.title}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-slate-400">Target: <strong className="text-indigo-300">{dir.targetProgram || dir.targetDepartment}</strong></span>
                  <span className="text-slate-500">•</span>
                  <span className="flex items-center gap-1 text-amber-300 font-semibold">
                    <Clock className="w-3 h-3" /> {dir.deadline}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed bg-black/20 p-2.5 rounded border border-white/5 font-medium mb-2.5">
                "{dir.message}"
              </p>

              {/* Status and Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-400">Status:</span>
                  {dir.status === 'OPEN' && (
                    <span className="font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                      ● Action Required by HOD
                    </span>
                  )}
                  {dir.status === 'FORWARDED' && (
                    <div className="flex items-center gap-1 font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                      <CornerDownRight className="w-3 h-3 text-indigo-400" />
                      <span>Forwarded to {dir.forwardedByHOD?.coordinatorName || 'Coordinator'}</span>
                    </div>
                  )}
                  {dir.status === 'RESOLVED' && (
                    <span className="font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                      ✓ Completed by {dir.resolutionDetails?.resolvedBy || 'Coordinator'}
                    </span>
                  )}
                </div>

                {dir.status !== 'RESOLVED' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenForwardModal(dir)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-indigo-500/20"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Forward Message to Coordinator</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Forwarded Details note if available */}
              {dir.forwardedByHOD && (
                <div className="mt-2.5 pt-2 border-t border-indigo-900/60 text-[11px] text-slate-300 space-y-1 bg-indigo-950/30 p-2 rounded">
                  <div className="flex items-center justify-between text-[10px] text-indigo-300 font-semibold">
                    <span>Forwarding Log: HOD → {dir.forwardedByHOD.coordinatorName}</span>
                    <span>{new Date(dir.forwardedByHOD.forwardedAt).toLocaleString()}</span>
                  </div>
                  <p className="italic text-slate-300 text-[11px]">"{dir.forwardedByHOD.noteToCoordinator}"</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: Forward Directive to Coordinator */}
      {selectedDirectiveToForward && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-white animate-scale-up">
            <div className="bg-slate-800/80 px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-black uppercase text-white">
                    Forward VC Directive to Coordinator
                  </h3>
                  <p className="text-[10px] text-slate-400">Assign departmental task execution to Program Coordinator</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDirectiveToForward(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchToCoordinator} className="p-5 space-y-4">
              {/* VC Directive Original Preview */}
              <div className="p-3 bg-slate-950 rounded-xl border border-indigo-900/50 space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-indigo-400 uppercase">Original VC Mandate</span>
                  <span className="text-slate-400">Deadline: {selectedDirectiveToForward.deadline}</span>
                </div>
                <p className="text-xs font-bold text-white">{selectedDirectiveToForward.title}</p>
                <p className="text-[11px] text-slate-300 italic">"{selectedDirectiveToForward.message}"</p>
              </div>

              {/* Select Program Coordinator */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Select Program Coordinator
                </label>
                {availableCoordinators.length > 0 ? (
                  <select
                    value={selectedCoordinatorEmail}
                    onChange={(e) => setSelectedCoordinatorEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {availableCoordinators.map((c) => (
                      <option key={c.id} value={c.email}>
                        {c.name} ({c.program || c.assignedPrograms?.join(', ') || 'Program Coordinator'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-amber-400 font-medium">
                    No registered coordinator found for this department. Enter coordinator details below or create an account in User Management.
                  </div>
                )}
              </div>

              {/* Custom HOD Instruction Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  HOD Specific Note &amp; Instructions for Coordinator
                </label>
                <textarea
                  rows={3}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Add your note or urgency instructions..."
                  required
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedDirectiveToForward(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-indigo-600/30 uppercase tracking-wider"
                >
                  <Send className="w-4 h-4" />
                  <span>Dispatch Message to Coordinator</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
