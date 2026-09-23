import React, { useState, useMemo } from 'react';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import { NotificationService, FacultyReminderNotification, TargetAudienceType } from '../services/notificationService';
import { AuthService } from '../services/authService';
import { UserAccount, ActiveUserSession, AcademicShift } from '../types';
import {
  Bell,
  Send,
  X,
  AlertCircle,
  Building2,
  GraduationCap,
  Clock,
  CheckCircle2,
  Eye,
  Megaphone,
  UserCheck,
  Users,
  User,
  ShieldCheck
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount | ActiveUserSession | null;
  defaultDepartment?: string;
  defaultProgram?: string;
  defaultShift?: AcademicShift;
  defaultSession?: string;
  defaultSemester?: string;
  defaultSection?: string;
  onSuccess?: (notification: FacultyReminderNotification) => void;
}

export const SendFacultyReminderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  defaultDepartment,
  defaultProgram,
  defaultShift = 'Morning',
  defaultSession = '2023',
  defaultSemester = '1',
  defaultSection = 'A',
  onSuccess,
}) => {
  const initialDept =
    defaultDepartment ||
    (currentUser?.role === 'HOD' || currentUser?.department ? currentUser.department : UNIVERSITY_DEPARTMENTS[0].name);

  const initialProg =
    defaultProgram ||
    (currentUser?.program
      ? currentUser.program
      : currentUser?.assignedPrograms && currentUser.assignedPrograms.length > 0
      ? currentUser.assignedPrograms[0]
      : UNIVERSITY_DEPARTMENTS[0].programs[0].name);

  const [department, setDepartment] = useState<string>(initialDept);
  const [program, setProgram] = useState<string>(initialProg);
  const [shift, setShift] = useState<string>(defaultShift);
  const [session, setSession] = useState<string>(defaultSession);
  const [semester, setSemester] = useState<string>(defaultSemester);
  const [section, setSection] = useState<string>(defaultSection);
  const [deadline, setDeadline] = useState<string>('Today by 5:00 PM');
  const [customDeadline, setCustomDeadline] = useState<string>('');

  // Target Recipient Audience State
  const [targetAudienceType, setTargetAudienceType] = useState<TargetAudienceType>('ALL_PROGRAM');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [targetRole, setTargetRole] = useState<string>('COORDINATOR');

  // Fetch registered user accounts for targeting
  const allAccounts = useMemo(() => AuthService.getAccounts(), []);
  
  // Filter registered users belonging to current department
  const deptMembers = useMemo(() => {
    return allAccounts.filter((a) => {
      if (!a.department) return true;
      const d1 = a.department.toLowerCase().trim();
      const d2 = department.toLowerCase().trim();
      return d1.includes(d2) || d2.includes(d1);
    });
  }, [allAccounts, department]);

  const selectedTargetUser = useMemo(() => {
    return allAccounts.find((a) => a.id === selectedUserId) || null;
  }, [allAccounts, selectedUserId]);

  const [title, setTitle] = useState<string>(
    `Action Required: Pending Result Upload Reminder for ${initialProg}`
  );

  const [message, setMessage] = useState<string>(
    `Dear Faculty Members & Course Instructors, please be reminded to finalize and upload all pending course result rosters for ${initialProg} (${defaultShift} Shift, Session ${defaultSession}) into the LMS database as soon as possible.`
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentDeptObj = UNIVERSITY_DEPARTMENTS.find(
    (d) => d.name.toLowerCase().trim() === department.toLowerCase().trim()
  ) || UNIVERSITY_DEPARTMENTS[0];

  const handleProgramChange = (progName: string) => {
    setProgram(progName);
    setTitle(`Action Required: Pending Result Upload Reminder for ${progName}`);
    if (targetAudienceType === 'INDIVIDUAL_MEMBER' && selectedTargetUser) {
      setMessage(
        `Dear ${selectedTargetUser.name}, please be reminded to finalize and upload pending course result rosters for ${progName} (${shift} Shift, Session ${session}) into the LMS database as soon as possible.`
      );
    } else {
      setMessage(
        `Dear Faculty Members & Course Instructors, please be reminded to finalize and upload all pending course result rosters for ${progName} (${shift} Shift, Session ${session}) into the LMS database as soon as possible.`
      );
    }
  };

  const handleTargetUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    const user = allAccounts.find((a) => a.id === userId);
    if (user) {
      setMessage(
        `Dear ${user.name}, please be reminded to finalize and upload pending course result rosters for ${program} (${shift} Shift, Session ${session}) into the LMS database as soon as possible.`
      );
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSubmitting(true);

    const finalDeadline = deadline === 'Custom' ? customDeadline : deadline;

    const senderRole =
      currentUser?.role === 'HOD'
        ? 'HOD'
        : currentUser?.role === 'COORDINATOR'
        ? 'COORDINATOR'
        : currentUser?.role === 'VC'
        ? 'VC'
        : 'ADMIN';

    const created = NotificationService.dispatchReminder({
      senderId: currentUser?.id,
      senderName: currentUser?.name || 'Academic Administrator',
      senderRole,
      department,
      program,
      shift,
      session,
      semester,
      section,
      title: title.trim(),
      message: message.trim(),
      deadline: finalDeadline.trim() || undefined,
      
      // Target recipient metadata
      targetAudienceType,
      targetUserId: targetAudienceType === 'INDIVIDUAL_MEMBER' ? selectedTargetUser?.id : undefined,
      targetUserName: targetAudienceType === 'INDIVIDUAL_MEMBER' ? selectedTargetUser?.name : undefined,
      targetUserEmail: targetAudienceType === 'INDIVIDUAL_MEMBER' ? selectedTargetUser?.email : undefined,
      targetRole: targetAudienceType === 'SPECIFIC_ROLE' ? targetRole : undefined,
    });

    setIsSubmitting(false);
    if (onSuccess) onSuccess(created);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight uppercase flex items-center gap-2">
                <span>Dispatch Faculty Result Upload Reminder</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/30 text-amber-300 border border-amber-400/30">
                  System Broadcast
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Sends an instant alert banner &amp; toast to faculty members assigned to your program.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSend} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Target Recipient Audience Group Selection */}
          <div className="bg-indigo-50/70 border border-indigo-200 p-3.5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600" />
                Target Recipient Audience (Who will see this message?)
              </label>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200">
                Audience Control
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTargetAudienceType('ALL_PROGRAM');
                  setMessage(
                    `Dear Faculty Members & Course Instructors, please be reminded to finalize and upload all pending course result rosters for ${program} (${shift} Shift, Session ${session}) into the LMS database as soon as possible.`
                  );
                }}
                className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  targetAudienceType === 'ALL_PROGRAM'
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                    : 'bg-white text-slate-800 border-slate-300 hover:bg-indigo-50/50'
                }`}
              >
                <div className="flex items-center gap-1 font-extrabold text-[11px]">
                  <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                  <span>Program Faculty</span>
                </div>
                <span className={`text-[9px] mt-1 ${targetAudienceType === 'ALL_PROGRAM' ? 'text-indigo-100' : 'text-slate-500'}`}>
                  Instructors of {program.length > 15 ? program.substring(0, 15) + '...' : program}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetAudienceType('ALL_DEPARTMENT');
                  setMessage(
                    `Dear Department Faculty & Staff, please be reminded to finalize and upload all pending course result rosters into the LMS database.`
                  );
                }}
                className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  targetAudienceType === 'ALL_DEPARTMENT'
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                    : 'bg-white text-slate-800 border-slate-300 hover:bg-indigo-50/50'
                }`}
              >
                <div className="flex items-center gap-1 font-extrabold text-[11px]">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Entire Department</span>
                </div>
                <span className={`text-[9px] mt-1 ${targetAudienceType === 'ALL_DEPARTMENT' ? 'text-indigo-100' : 'text-slate-500'}`}>
                  All members in {department.replace('Department of ', '')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetAudienceType('SPECIFIC_ROLE');
                  setMessage(
                    `Dear ${targetRole}s, please ensure all course grade result sheets for ${program} are finalized and uploaded.`
                  );
                }}
                className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  targetAudienceType === 'SPECIFIC_ROLE'
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                    : 'bg-white text-slate-800 border-slate-300 hover:bg-indigo-50/50'
                }`}
              >
                <div className="flex items-center gap-1 font-extrabold text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Specific Role</span>
                </div>
                <span className={`text-[9px] mt-1 ${targetAudienceType === 'SPECIFIC_ROLE' ? 'text-indigo-100' : 'text-slate-500'}`}>
                  Target by Role Designation
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetAudienceType('INDIVIDUAL_MEMBER');
                  if (deptMembers.length > 0) {
                    handleTargetUserSelect(deptMembers[0].id);
                  }
                }}
                className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  targetAudienceType === 'INDIVIDUAL_MEMBER'
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                    : 'bg-white text-slate-800 border-slate-300 hover:bg-indigo-50/50'
                }`}
              >
                <div className="flex items-center gap-1 font-extrabold text-[11px]">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span>Individual Person</span>
                </div>
                <span className={`text-[9px] mt-1 ${targetAudienceType === 'INDIVIDUAL_MEMBER' ? 'text-indigo-100' : 'text-slate-500'}`}>
                  Direct to 1 Specific Member
                </span>
              </button>
            </div>

            {/* Sub-selector for INDIVIDUAL_MEMBER */}
            {targetAudienceType === 'INDIVIDUAL_MEMBER' && (
              <div className="pt-2 border-t border-indigo-200/80 animate-in fade-in">
                <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                  Select Individual Recipient Member from Department:
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => handleTargetUserSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-indigo-300 rounded-lg bg-white text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 shadow-2xs text-xs"
                >
                  <option value="">-- Choose Individual Faculty Member / Coordinator --</option>
                  {deptMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.designation || m.role}) — {m.program || m.department || 'Staff Member'}
                    </option>
                  ))}
                </select>
                {deptMembers.length === 0 && (
                  <p className="text-[10px] text-amber-700 font-semibold mt-1">
                    No other registered members found in this department. Message will be targeted to recipient email/name when registered.
                  </p>
                )}
              </div>
            )}

            {/* Sub-selector for SPECIFIC_ROLE */}
            {targetAudienceType === 'SPECIFIC_ROLE' && (
              <div className="pt-2 border-t border-indigo-200/80 animate-in fade-in">
                <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  Select Target Designation Role:
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => {
                    const r = e.target.value;
                    setTargetRole(r);
                    setMessage(
                      `Dear ${r}s, please ensure all course grade result sheets for ${program} are finalized and uploaded into LMS.`
                    );
                  }}
                  className="w-full px-3 py-1.5 border border-indigo-300 rounded-lg bg-white text-slate-900 font-bold focus:ring-1 focus:ring-indigo-500 text-xs"
                >
                  <option value="COORDINATOR">Program Coordinators Only</option>
                  <option value="LECTURER">Regular Lecturers / Instructors Only</option>
                  <option value="VISITING_LECTURER">Visiting Lecturers Only</option>
                  <option value="HOD">Head of Department (HOD) Only</option>
                </select>
              </div>
            )}
          </div>

          {/* Target Department & Program Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                Target Department
              </label>
              <select
                value={department}
                disabled={currentUser?.role === 'HOD'}
                onChange={(e) => {
                  const newDept = e.target.value;
                  setDepartment(newDept);
                  const deptObj = UNIVERSITY_DEPARTMENTS.find((d) => d.name === newDept);
                  if (deptObj && deptObj.programs.length > 0) {
                    handleProgramChange(deptObj.programs[0].name);
                  }
                }}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800 font-semibold"
              >
                {UNIVERSITY_DEPARTMENTS.map((d) => (
                  <option key={d.code} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                Target Degree Program
              </label>
              <select
                value={program}
                onChange={(e) => handleProgramChange(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800 font-semibold"
              >
                {currentDeptObj.programs.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Academic Scope Options */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Shift</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium"
              >
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
                <option value="ALL">All Shifts</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Session Batch</label>
              <input
                type="text"
                value={session}
                onChange={(e) => setSession(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium"
                placeholder="2023"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Semester</label>
              <input
                type="text"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium"
                placeholder="1"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Section</label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium"
                placeholder="A"
              />
            </div>
          </div>

          {/* Title & Deadline */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Notification Headline / Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-bold text-slate-900"
                placeholder="Action Required: Pending Result Upload Reminder"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Submission Target Deadline
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {['Today by 5:00 PM', 'Tomorrow by 12:00 PM', 'Within 24 Hours', 'Custom'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDeadline(d)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      deadline === d
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {deadline === 'Custom' && (
                <input
                  type="text"
                  value={customDeadline}
                  onChange={(e) => setCustomDeadline(e.target.value)}
                  placeholder="e.g., Friday, 28th Sept 2026 at 4:00 PM"
                  className="w-full mt-2 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Custom Reminder Message for Faculty
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 text-slate-800 leading-relaxed font-medium"
                placeholder="Write specific instructions or reminders for course instructors..."
              />
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-extrabold text-amber-900 border-b border-amber-200/80 pb-1.5">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-700" />
                Live Notification Preview (What Faculty Will See)
              </span>
              <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded">
                Recipient View
              </span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-amber-300/60 shadow-2xs space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                    🔔
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">{title || 'Notification Title'}</h4>
                    <p className="text-[10px] font-semibold text-slate-500">
                      From: {currentUser?.name || 'HOD / Coordinator'} ({currentUser?.role || 'HOD'}) • {department}
                    </p>
                  </div>
                </div>

                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                  {deadline === 'Custom' ? customDeadline || 'Target Due' : deadline}
                </span>
              </div>

              <p className="text-[11px] text-slate-700 font-medium pl-8">{message}</p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !message.trim()}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-lg shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Dispatching...' : 'Dispatch Faculty Reminder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
