import React, { useState, useEffect } from 'react';
import { NotificationService, FacultyReminderNotification } from '../services/notificationService';
import { UserAccount, ActiveUserSession } from '../types';
import {
  BellRing,
  X,
  Clock,
  ArrowUpRight,
  Megaphone,
  CheckCircle2,
  Building2,
  GraduationCap
} from 'lucide-react';

interface Props {
  currentUser?: UserAccount | ActiveUserSession | null;
  onNavigateToProgram?: (department: string, program: string, shift?: string) => void;
}

export const FacultyReminderBanner: React.FC<Props> = ({
  currentUser,
  onNavigateToProgram,
}) => {
  const [reminders, setReminders] = useState<FacultyReminderNotification[]>([]);

  const refreshReminders = () => {
    const all = NotificationService.getReminders();
    const userId = currentUser?.id || currentUser?.username || 'anonymous';

    // Filter relevant reminders
    const filtered = all.filter((r) => {
      if (!r.active) return false;
      // Check if dismissed
      if (r.dismissedBy && r.dismissedBy.includes(userId)) return false;

      // Check matching scope:
      // 1. Sender always sees their own dispatched reminder
      const isSender =
        (r.senderId && currentUser?.id === r.senderId) ||
        (r.senderName && currentUser?.name && currentUser.name.toLowerCase().trim() === r.senderName.toLowerCase().trim());
      if (isSender) return true;

      // 2. VC and ADMIN see all executive communications
      if (currentUser?.role === 'ADMIN' || currentUser?.role === 'VC') return true;

      // 3. Check Individual Recipient Targeting
      if (r.targetAudienceType === 'INDIVIDUAL_MEMBER') {
        const isTargetUser =
          (r.targetUserId && currentUser?.id === r.targetUserId) ||
          (r.targetUserEmail && currentUser?.email && currentUser.email.toLowerCase().trim() === r.targetUserEmail.toLowerCase().trim()) ||
          (r.targetUserName && currentUser?.name && currentUser.name.toLowerCase().trim() === r.targetUserName.toLowerCase().trim());

        return Boolean(isTargetUser);
      }

      // 4. Check Specific Role Designation Targeting
      if (r.targetAudienceType === 'SPECIFIC_ROLE') {
        if (currentUser?.role !== r.targetRole) return false;
      }

      // 5. Department match check
      const userDept = (currentUser?.department || '').toLowerCase().trim();
      const remDept = (r.department || '').toLowerCase().trim();
      const matchDept =
        !r.department ||
        remDept === 'all' ||
        !userDept ||
        userDept.includes(remDept) ||
        remDept.includes(userDept);

      if (!matchDept) return false;

      // If target audience is ALL_DEPARTMENT, everyone in department sees it
      if (r.targetAudienceType === 'ALL_DEPARTMENT') return true;

      // 6. If HOD, HOD sees department level communications
      if (currentUser?.role === 'HOD') return true;

      // 7. For Program Instructors / Coordinators: check program match
      if (r.program && r.program.toUpperCase() !== 'ALL') {
        const remProg = r.program.toLowerCase().trim();
        const userProgs = [
          currentUser?.program,
          ...(currentUser?.assignedPrograms || [])
        ].filter(Boolean).map((p) => (p as string).toLowerCase().trim());

        if (userProgs.length > 0) {
          const hasProgMatch = userProgs.some(
            (up) => up === remProg || up.includes(remProg) || remProg.includes(up)
          );
          if (!hasProgMatch) return false;
        }
      }

      return true;
    });

    setReminders(filtered);
  };

  useEffect(() => {
    refreshReminders();
    const unsubscribe = NotificationService.listen(() => {
      refreshReminders();
    });
    window.addEventListener('mnsuet_auth_changed', refreshReminders);
    return () => {
      unsubscribe();
      window.removeEventListener('mnsuet_auth_changed', refreshReminders);
    };
  }, [currentUser]);

  if (reminders.length === 0) return null;

  const handleDismiss = (id: string) => {
    const userId = currentUser?.id || currentUser?.username || 'anonymous';
    NotificationService.dismissReminder(id, userId);
    refreshReminders();
  };

  return (
    <div id="faculty-reminder-banner-container" className="space-y-3 mb-5 animate-in fade-in slide-in-from-top-3">
      {reminders.map((rem) => (
        <div
          key={rem.id}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 text-white p-4 sm:p-5 border-2 border-amber-500/60 shadow-xl"
        >
          {/* Subtle Ambient Background Accent */}
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            {/* Main Content */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-lg shadow-amber-500/20">
                <BellRing className="w-5 h-5 animate-bounce" />
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                    <Megaphone className="w-3 h-3" />
                    Faculty Upload Reminder
                  </span>

                  <span className="text-[11px] font-bold text-amber-200/90 bg-amber-900/50 px-2.5 py-0.5 rounded-full border border-amber-700/60">
                    From: <strong>{rem.senderName}</strong> ({rem.senderRole})
                  </span>

                  {rem.targetAudienceType === 'INDIVIDUAL_MEMBER' && rem.targetUserName && (
                    <span className="text-[11px] font-extrabold text-sky-200 bg-sky-900/60 px-2.5 py-0.5 rounded-full border border-sky-500/50">
                      Direct To: <strong>{rem.targetUserName}</strong>
                    </span>
                  )}

                  {rem.targetAudienceType === 'SPECIFIC_ROLE' && rem.targetRole && (
                    <span className="text-[11px] font-extrabold text-indigo-200 bg-indigo-900/60 px-2.5 py-0.5 rounded-full border border-indigo-500/50">
                      Target Role: <strong>{rem.targetRole}</strong>
                    </span>
                  )}

                  {rem.targetAudienceType === 'ALL_DEPARTMENT' && (
                    <span className="text-[11px] font-extrabold text-teal-200 bg-teal-900/60 px-2.5 py-0.5 rounded-full border border-teal-500/50">
                      Target: <strong>All Department Members</strong>
                    </span>
                  )}

                  {rem.deadline && (
                    <span className="text-[11px] font-extrabold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/40 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      Target Due: {rem.deadline}
                    </span>
                  )}
                </div>

                <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                  {rem.title}
                </h3>

                <p className="text-xs text-slate-200 leading-relaxed max-w-4xl">
                  {rem.message}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300 pt-1">
                  <span className="flex items-center gap-1 font-semibold">
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    {rem.department}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-semibold text-emerald-300">
                    <GraduationCap className="w-3.5 h-3.5" />
                    {rem.program} ({rem.shift || 'Morning'} Shift)
                  </span>
                  {rem.semester && (
                    <>
                      <span>•</span>
                      <span>Semester {rem.semester} (Sec {rem.section || 'A'})</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
              {onNavigateToProgram && (
                <button
                  type="button"
                  onClick={() => onNavigateToProgram(rem.department, rem.program, rem.shift)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
                >
                  <span>Open Entry Roster</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => handleDismiss(rem.id)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Acknowledge and dismiss this reminder"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Acknowledge</span>
              </button>

              <button
                type="button"
                onClick={() => handleDismiss(rem.id)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
