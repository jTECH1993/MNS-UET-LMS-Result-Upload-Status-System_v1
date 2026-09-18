import React, { useState } from 'react';
import { ActiveUserSession, AcademicShift, ProgramAccessRequest } from '../types';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import { AuthService } from '../services/authService';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Layers,
  Plus,
  Send,
  ShieldCheck,
  Sun,
  Moon,
  X,
  XCircle,
  AlertCircle,
  Building,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ActiveUserSession;
  onRequestSubmitted?: (request: ProgramAccessRequest) => void;
}

export const RequestAdditionalProgramModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  onRequestSubmitted,
}) => {
  if (!isOpen) return null;

  // Find user's department object
  const userDeptObj = UNIVERSITY_DEPARTMENTS.find(
    (d) => d.name.trim().toLowerCase() === (currentUser.department || '').trim().toLowerCase()
  ) || UNIVERSITY_DEPARTMENTS[0];

  const assignedPrograms = currentUser.assignedPrograms || (currentUser.program ? [currentUser.program] : []);
  
  // Available department programs not yet assigned
  const availableDeptPrograms = userDeptObj.programs.filter(
    (p) => !assignedPrograms.includes(p.name)
  );

  // Form states
  const [selectedDepartment, setSelectedDepartment] = useState<string>(currentUser.department || UNIVERSITY_DEPARTMENTS[0].name);
  const [selectedProgram, setSelectedProgram] = useState<string>(availableDeptPrograms[0]?.name || userDeptObj.programs[0]?.name || '');
  const [selectedShifts, setSelectedShifts] = useState<AcademicShift[]>(['Morning', 'Evening']);
  const [justification, setJustification] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // User's existing requests
  const userRequests = AuthService.getUserProgramRequests(currentUser.id);
  const pendingRequests = userRequests.filter((r) => r.status === 'PENDING');
  const pastRequests = userRequests.filter((r) => r.status !== 'PENDING');

  const handleShiftPreset = (preset: 'Both' | 'Morning' | 'Evening') => {
    if (preset === 'Both') {
      setSelectedShifts(['Morning', 'Evening']);
    } else {
      setSelectedShifts([preset]);
    }
  };

  const toggleShift = (shift: AcademicShift) => {
    if (selectedShifts.includes(shift)) {
      if (selectedShifts.length === 1) {
        // Toggle to the other shift so at least one is selected
        setSelectedShifts([shift === 'Morning' ? 'Evening' : 'Morning']);
      } else {
        setSelectedShifts(selectedShifts.filter((s) => s !== shift));
      }
    } else {
      setSelectedShifts([...selectedShifts, shift]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgram) {
      setFeedback({ type: 'error', message: 'Please select a degree program to request.' });
      return;
    }
    if (selectedShifts.length === 0) {
      setFeedback({ type: 'error', message: 'Please select at least one academic shift (Morning or Evening).' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const result = AuthService.requestAdditionalProgramAccess(
      currentUser.id,
      selectedProgram,
      selectedShifts,
      justification
    );

    setIsSubmitting(false);

    if (result.success && result.request) {
      setFeedback({ type: 'success', message: result.message });
      if (onRequestSubmitted) {
        onRequestSubmitted(result.request);
      }
      setJustification('');
      // Auto close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 1800);
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  // Get current active department programs for dropdown
  const currentDeptObj = UNIVERSITY_DEPARTMENTS.find(
    (d) => d.name.trim().toLowerCase() === selectedDepartment.trim().toLowerCase()
  ) || userDeptObj;

  return (
    <div
      id="request-additional-program-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="request-additional-program-modal-content"
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-linear-to-r from-teal-800 via-teal-700 to-emerald-800 text-white p-4 sm:p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/15 shadow-inner">
              <Layers className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Request Additional Degree Program</span>
                <span className="text-[10px] bg-teal-500/30 text-teal-100 font-bold px-2 py-0.5 rounded-full border border-teal-300/30">
                  HOD Approval
                </span>
              </h3>
              <p className="text-xs text-teal-100/90 font-medium mt-0.5">
                Extend your coordination access to other degree programs or shifts in your department
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-800 text-xs">
          {/* User Status Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-teal-700" />
                {currentUser.department}
              </span>
              <span className="font-mono text-slate-600 font-semibold">{currentUser.name}</span>
            </div>
            
            <div>
              <span className="text-[11px] font-bold text-slate-600 block mb-1">
                Currently Authorized Programs:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {assignedPrograms.map((prog) => {
                  const shifts = currentUser.programShiftAssignments?.[prog] || currentUser.assignedShifts || ['Morning', 'Evening'];
                  return (
                    <span
                      key={prog}
                      className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg px-2.5 py-1 text-xs font-semibold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{prog}</span>
                      <span className="text-[10px] bg-emerald-200/70 text-emerald-900 font-bold px-1.5 py-0.2 rounded">
                        {shifts.join(' & ')}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : feedback.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium">{feedback.message}</p>
              </div>
            </div>
          )}

          {/* Pending Requests Alert */}
          {pendingRequests.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-700 shrink-0 animate-pulse" />
                <h4 className="font-bold text-amber-950 text-xs">
                  Awaiting HOD Review ({pendingRequests.length})
                </h4>
              </div>
              <div className="space-y-1.5">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white/80 border border-amber-200 rounded-lg p-2.5 flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-bold text-slate-800 text-xs">{req.requestedProgram}</span>
                      <div className="text-[11px] text-amber-800 mt-0.5">
                        Shifts: <span className="font-semibold">{req.requestedShifts.join(', ')}</span> • Submitted{' '}
                        {new Date(req.requestedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-full shrink-0">
                      Pending HOD
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Request Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Program Selection */}
            <div>
              <label htmlFor="req-program-select" className="block text-xs font-bold text-slate-700 mb-1.5">
                Select Program to Request <span className="text-rose-600">*</span>
              </label>
              <select
                id="req-program-select"
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all cursor-pointer"
                required
              >
                <option value="" disabled>-- Select Degree Program --</option>
                {currentDeptObj.programs.map((prog) => {
                  const isAssigned = assignedPrograms.includes(prog.name);
                  const isPending = pendingRequests.some((r) => r.requestedProgram === prog.name);
                  return (
                    <option key={prog.name} value={prog.name} disabled={isAssigned || isPending}>
                      {prog.name} ({prog.degreeLevel}) {isAssigned ? '✓ [Already Authorized]' : isPending ? '⏳ [Pending Review]' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Academic Shifts for requested program */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Select Coordinated Shifts <span className="text-rose-600">*</span>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleShiftPreset('Both')}
                    className={`text-[10px] px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                      selectedShifts.length === 2
                        ? 'bg-teal-700 text-white'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    Both (M+E)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShiftPreset('Morning')}
                    className={`text-[10px] px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                      selectedShifts.length === 1 && selectedShifts[0] === 'Morning'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    Morning Only
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShiftPreset('Evening')}
                    className={`text-[10px] px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                      selectedShifts.length === 1 && selectedShifts[0] === 'Evening'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    Evening Only
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => toggleShift('Morning')}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    selectedShifts.includes('Morning')
                      ? 'bg-amber-50/80 border-amber-300 text-amber-950 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-500 font-medium hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sun className={`w-4 h-4 ${selectedShifts.includes('Morning') ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span>Morning Shift</span>
                  </div>
                  <span className={`text-xs ${selectedShifts.includes('Morning') ? 'text-amber-700' : 'text-slate-400'}`}>
                    {selectedShifts.includes('Morning') ? '✓ Selected' : '+ Add'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleShift('Evening')}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    selectedShifts.includes('Evening')
                      ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-500 font-medium hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Moon className={`w-4 h-4 ${selectedShifts.includes('Evening') ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>Evening Shift</span>
                  </div>
                  <span className={`text-xs ${selectedShifts.includes('Evening') ? 'text-indigo-700' : 'text-slate-400'}`}>
                    {selectedShifts.includes('Evening') ? '✓ Selected' : '+ Add'}
                  </span>
                </button>
              </div>
            </div>

            {/* Justification / HOD Note */}
            <div>
              <label htmlFor="req-justification" className="block text-xs font-bold text-slate-700 mb-1">
                Optional Justification / Note for HOD
              </label>
              <textarea
                id="req-justification"
                rows={2}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="e.g. Assigned to coordinate Fall 2024 cohort or oversee evening shift results..."
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedProgram || selectedShifts.length === 0}
                className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Request to HOD'}</span>
              </button>
            </div>
          </form>

          {/* Past Request History */}
          {pastRequests.length > 0 && (
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Recent Request History
              </h4>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {pastRequests.map((req) => (
                  <div
                    key={req.id}
                    className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                      req.status === 'APPROVED'
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                        : 'bg-rose-50/60 border-rose-200 text-rose-950'
                    }`}
                  >
                    <div>
                      <span className="font-semibold">{req.requestedProgram}</span>
                      <span className="text-slate-500 ml-1.5">({req.requestedShifts.join(', ')})</span>
                      {req.reviewedBy && (
                        <span className="text-[10px] text-slate-500 block">
                          Reviewed by {req.reviewedBy} on {new Date(req.reviewedAt || '').toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        req.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
