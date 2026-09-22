import React, { useState, useEffect, useMemo } from 'react';
import {
  Timer,
  Edit3,
  Save,
  X,
  Unlock,
  Lock,
  ShieldCheck,
  Layers,
  CheckCircle2,
  AlertCircle,
  Calendar,
  RotateCcw,
  Sparkles,
  History,
  BarChart3,
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { LockdownLogSection } from './LockdownLogSection';
import { LockdownAnalyticsSection } from './LockdownAnalyticsSection';

interface Props {
  currentSession: string;
  semesterFilter?: string;
  activeSessions?: string[];
  selectedSemesters?: string[];
  isVC?: boolean;
}

export const DeadlineBanner: React.FC<Props> = ({
  currentSession,
  semesterFilter = '1',
  activeSessions = [],
  selectedSemesters = [],
  isVC = false,
}) => {
  // Determine primary active session & semester
  const primarySession = useMemo(() => {
    if (currentSession && currentSession.trim()) return currentSession.trim();
    if (activeSessions && activeSessions.length > 0) return activeSessions[0].trim();
    return StorageService.getSelectedSession() || '2023';
  }, [currentSession, activeSessions]);

  const primarySemester = useMemo(() => {
    if (semesterFilter && semesterFilter.trim()) return semesterFilter.trim();
    if (selectedSemesters && selectedSemesters.length > 0) return selectedSemesters[0].trim();
    return '1';
  }, [semesterFilter, selectedSemesters]);

  const isAllSemesters = primarySemester === 'ALL' || (selectedSemesters && selectedSemesters.includes('ALL'));

  const semesterDisplay = useMemo(() => {
    if (isAllSemesters) return 'All Semesters (1–8)';
    if (primarySemester.includes(',')) return `Semesters ${primarySemester}`;
    return `Semester ${primarySemester}`;
  }, [isAllSemesters, primarySemester]);

  const semesterShortDisplay = useMemo(() => {
    if (isAllSemesters) return 'All Semesters';
    if (primarySemester.includes(',')) return `Sem ${primarySemester}`;
    return `Sem ${primarySemester}`;
  }, [isAllSemesters, primarySemester]);

  // Reactive state for lockdown and deadline
  const [isLockdownDisabled, setIsLockdownDisabled] = useState<boolean>(() =>
    StorageService.getLockdownDisabled(primarySession, primarySemester)
  );

  const [targetDate, setTargetDate] = useState<Date>(() => {
    const stored = StorageService.getSystemDeadline(primarySession, primarySemester);
    if (stored) return new Date(stored);
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    return defaultDate;
  });

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDateStr, setEditDateStr] = useState('');
  const [applyEditToAllSemesters, setApplyEditToAllSemesters] = useState(false);

  // Modal for Executive Session & Semester Matrix
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
  const [matrixVersion, setMatrixVersion] = useState(0);

  // Lockdown Log Section States
  const [showInlineLogs, setShowInlineLogs] = useState(false);
  const [matrixModalTab, setMatrixModalTab] = useState<'matrix' | 'logs' | 'analytics'>('matrix');
  const [logCount, setLogCount] = useState<number>(() => StorageService.getLockdownLogs().length);

  useEffect(() => {
    const handleLogsUpdate = () => {
      setLogCount(StorageService.getLockdownLogs().length);
    };
    window.addEventListener('mnsuet_lockdown_logs_updated', handleLogsUpdate);
    return () => window.removeEventListener('mnsuet_lockdown_logs_updated', handleLogsUpdate);
  }, []);

  // Sync state when primarySession or primarySemester changes
  useEffect(() => {
    const disabled = StorageService.getLockdownDisabled(primarySession, primarySemester);
    setIsLockdownDisabled(disabled);

    const storedDeadline = StorageService.getSystemDeadline(primarySession, primarySemester);
    if (storedDeadline) {
      setTargetDate(new Date(storedDeadline));
    } else {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 3);
      setTargetDate(defaultDate);
    }
  }, [primarySession, primarySemester]);

  // Listen to live system events
  useEffect(() => {
    const handleDeadlineUpdated = () => {
      setIsLockdownDisabled(StorageService.getLockdownDisabled(primarySession, primarySemester));
      const stored = StorageService.getSystemDeadline(primarySession, primarySemester);
      if (stored) {
        setTargetDate(new Date(stored));
      } else {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 3);
        setTargetDate(defaultDate);
      }
      setMatrixVersion((v) => v + 1);
    };

    window.addEventListener('mnsuet_deadline_updated', handleDeadlineUpdated);
    return () => window.removeEventListener('mnsuet_deadline_updated', handleDeadlineUpdated);
  }, [primarySession, primarySemester]);

  // Realtime countdown timer
  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
        setIsExpired(false);
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsExpired(true);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const handleEditClick = () => {
    const tzOffset = targetDate.getTimezoneOffset() * 60000;
    const localISOTime = new Date(targetDate.getTime() - tzOffset).toISOString().slice(0, 16);
    setEditDateStr(localISOTime);
    setApplyEditToAllSemesters(isAllSemesters);
    setIsEditing(true);
  };

  const handleSaveDeadline = () => {
    if (!editDateStr) return;
    const newTarget = new Date(editDateStr);
    setTargetDate(newTarget);
    StorageService.setSystemDeadline(
      newTarget.toISOString(),
      primarySession,
      primarySemester,
      applyEditToAllSemesters
    );
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // Toggle lockdown for the current active scope
  const toggleLockdown = (turnDisabled: boolean, applyToAll: boolean = isAllSemesters) => {
    StorageService.setLockdownDisabled(turnDisabled, primarySession, primarySemester, applyToAll);
    setIsLockdownDisabled(turnDisabled);
    setMatrixVersion((v) => v + 1);
  };

  const bgStyle = isLockdownDisabled
    ? 'bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 border-emerald-700/80'
    : isExpired
    ? 'bg-gradient-to-br from-rose-900 to-rose-950 border-rose-800'
    : 'bg-gradient-to-br from-indigo-900 to-indigo-950 border-indigo-800';

  const iconBgStyle = isLockdownDisabled
    ? 'bg-emerald-800 border-emerald-600'
    : isExpired
    ? 'bg-rose-800 border-rose-600'
    : 'bg-indigo-800 border-indigo-600';

  // Available sessions for matrix modal
  const availableSessionsList = useMemo(() => {
    const list = StorageService.getAvailableSessions();
    return list.length > 0 ? list : ['2023', '2024', '2025'];
  }, [matrixVersion]);

  return (
    <>
      <div
        className={`rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden shadow-xl border ${bgStyle}`}
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay pointer-events-none" />
        <div
          className={`absolute top-0 right-0 p-16 blur-[100px] rounded-full pointer-events-none ${
            isLockdownDisabled
              ? 'bg-emerald-500/10'
              : isExpired
              ? 'bg-rose-500/10'
              : 'bg-indigo-500/10'
          }`}
        />

        <div className="flex items-start sm:items-center gap-4 z-10 flex-1 min-w-0">
          <div className={`p-3 rounded-lg shrink-0 border mt-0.5 sm:mt-0 ${iconBgStyle}`}>
            {isLockdownDisabled ? (
              <Unlock className="w-6 h-6 text-emerald-300 animate-pulse" />
            ) : isExpired ? (
              <Lock className="w-6 h-6 text-rose-300" />
            ) : (
              <Timer className="w-6 h-6 text-indigo-300 animate-pulse" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            {/* Session & Semester Scope Identification Tag */}
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-2xs ${
                  isLockdownDisabled
                    ? 'bg-emerald-900/90 text-emerald-200 border-emerald-500'
                    : isExpired
                    ? 'bg-rose-900/90 text-rose-200 border-rose-600'
                    : 'bg-indigo-900/90 text-indigo-200 border-indigo-600'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Scope: Session {primarySession}</span>
                <span className="opacity-50">•</span>
                <span>{semesterShortDisplay}</span>
              </span>

              {isLockdownDisabled && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Unlocked by VC
                </span>
              )}
            </div>

            {/* Main Header with Title & Action Controls */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2
                className={`text-base sm:text-lg font-black tracking-wide truncate ${
                  isLockdownDisabled
                    ? 'text-emerald-50'
                    : isExpired
                    ? 'text-rose-50'
                    : 'text-indigo-50'
                }`}
              >
                {isLockdownDisabled
                  ? `LMS Portal Lockdown Lifted (Unlocked by VC) — Session ${primarySession} (${semesterShortDisplay})`
                  : isExpired
                  ? `LMS Portal Lockdown Active — Session ${primarySession} (${semesterShortDisplay})`
                  : `LMS Portal Lock Deadline — Session ${primarySession} (${semesterShortDisplay})`}
              </h2>

              {isVC && !isEditing && (
                <div className="flex flex-wrap items-center gap-2">
                  {/* VC Toggle Lockdown Button for this Specific Session & Semester */}
                  {isLockdownDisabled ? (
                    <button
                      type="button"
                      onClick={() => toggleLockdown(false)}
                      className="px-2.5 py-1.5 flex items-center gap-1.5 rounded-md text-xs font-bold transition-all shadow-sm border bg-amber-600 hover:bg-amber-500 text-white border-amber-500 ring-1 ring-amber-400/50 cursor-pointer"
                      title={`Re-enforce portal lockdown specifically for Session ${primarySession} (${semesterShortDisplay})`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Turn Lockdown ON ({semesterShortDisplay})</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleLockdown(true)}
                      className="px-2.5 py-1.5 flex items-center gap-1.5 rounded-md text-xs font-bold transition-all shadow-sm border bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 ring-1 ring-emerald-400/50 cursor-pointer"
                      title={`Turn OFF lockdown specifically for Session ${primarySession} (${semesterShortDisplay})`}
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Turn Lockdown OFF ({semesterShortDisplay})</span>
                    </button>
                  )}

                  {/* Edit / Extend Deadline Button */}
                  <button
                    type="button"
                    onClick={handleEditClick}
                    className={`px-2.5 py-1.5 flex items-center gap-1.5 rounded-md text-xs font-bold transition-all shadow-sm border cursor-pointer ${
                      isLockdownDisabled
                        ? 'bg-slate-800 hover:bg-slate-700 text-emerald-200 border-emerald-600/50'
                        : isExpired
                        ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 ring-1 ring-rose-400/50'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 ring-1 ring-indigo-400/50'
                    }`}
                    title={isExpired ? 'Extend Deadline for this cohort' : 'Change Deadline for this cohort'}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isExpired ? 'Extend Deadline' : 'Edit Deadline'}</span>
                  </button>

                  {/* Executive Session & Semester Matrix Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setMatrixModalTab('matrix');
                      setIsMatrixModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 flex items-center gap-1.5 rounded-md text-xs font-bold transition-all shadow-sm border bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-600 cursor-pointer"
                    title="View and configure lockdown status for all academic sessions & semesters"
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Lockdown Matrix</span>
                  </button>

                  {/* Lockdown Log Button */}
                  <button
                    type="button"
                    onClick={() => setShowInlineLogs((prev) => !prev)}
                    className={`px-2.5 py-1.5 flex items-center gap-1.5 rounded-md text-xs font-bold transition-all shadow-sm border cursor-pointer ${
                      showInlineLogs
                        ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/50'
                        : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-600'
                    }`}
                    title="View past lockdown events, session, semester, timestamp, and admin triggers"
                  >
                    <History className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Lockdown Log ({logCount})</span>
                  </button>
                </div>
              )}
            </div>

            {/* Explanatory Text with Explicit Session and Semester Scope */}
            <p
              className={`text-[11px] font-medium leading-relaxed max-w-2xl ${
                isLockdownDisabled
                  ? 'text-emerald-200'
                  : isExpired
                  ? 'text-rose-200'
                  : 'text-indigo-200'
              }`}
            >
              {isLockdownDisabled ? (
                isVC ? (
                  <>
                    Vice Chancellor Override Active: System lockdown is currently turned{' '}
                    <strong>OFF</strong> specifically for{' '}
                    <strong>Academic Session {primarySession} ({semesterDisplay})</strong>. HODs and
                    Coordinators can submit and edit LMS result entries without deadline restrictions for this cohort.
                  </>
                ) : (
                  <>
                    The Vice Chancellor has turned <strong>OFF</strong> system lockdown for{' '}
                    <strong>Academic Session {primarySession} ({semesterDisplay})</strong>. LMS result
                    entry forms are unlocked for submission and edits.
                  </>
                )
              ) : isVC ? (
                isExpired ? (
                  <>
                    Academic Session {primarySession} ({semesterDisplay}) submission deadline has passed. LMS entry
                    forms are locked. Click <strong>Turn Lockdown OFF</strong> or <strong>Extend Deadline</strong> to
                    allow departmental uploads.
                  </>
                ) : (
                  <>
                    Academic Session {primarySession} ({semesterDisplay}) finalization. All concerned HODs must submit
                    genuine results before system lockdown.
                  </>
                )
              ) : isExpired ? (
                <>
                  The result submission deadline for <strong>Academic Session {primarySession} ({semesterDisplay})</strong>{' '}
                  has expired. The form is locked in read-only mode. Please contact the Vice Chancellor to request an unlock or extension.
                </>
              ) : (
                <>
                  The Vice Chancellor has given you this time to complete the LMS Result Uploads for{' '}
                  <strong>Academic Session {primarySession} ({semesterDisplay})</strong>. All concerned HODs must
                  submit genuine results before system lockdown.
                </>
              )}
            </p>

            {/* Inline Deadline Editor */}
            {isEditing && (
              <div
                className={`mt-3 p-3 rounded-lg border max-w-md ${
                  isLockdownDisabled
                    ? 'bg-emerald-950/80 border-emerald-700/50'
                    : isExpired
                    ? 'bg-rose-950/80 border-rose-700/50'
                    : 'bg-indigo-950/80 border-indigo-700/50'
                }`}
              >
                <div className="text-[11px] font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Set Deadline for Session {primarySession} ({semesterShortDisplay})</span>
                  <span className="text-[10px] text-slate-400">Target Time</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <input
                    type="datetime-local"
                    value={editDateStr}
                    onChange={(e) => setEditDateStr(e.target.value)}
                    className={`text-white text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 flex-1 ${
                      isLockdownDisabled
                        ? 'bg-emerald-900 border border-emerald-700'
                        : isExpired
                        ? 'bg-rose-900 border border-rose-700'
                        : 'bg-indigo-900 border border-indigo-700'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleSaveDeadline}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                    title="Save Deadline"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="p-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={applyEditToAllSemesters}
                    onChange={(e) => setApplyEditToAllSemesters(e.target.checked)}
                    className="rounded border-slate-600 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Apply this deadline to all 8 semesters of Session {primarySession}</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Right Status / Countdown Timer Box with Scope Label */}
        <div
          className={`z-10 px-4 py-3 rounded-xl border flex flex-col items-center justify-center shrink-0 min-w-[200px] ${
            isLockdownDisabled
              ? 'bg-emerald-950/70 border-emerald-700/80'
              : isExpired
              ? 'bg-rose-950/60 border-rose-800/80'
              : 'bg-indigo-950/60 border-indigo-800/80'
          }`}
        >
          {isLockdownDisabled ? (
            <div className="flex flex-col items-center justify-center px-2 py-1 text-center">
              <span className="text-xs font-black text-emerald-300 uppercase tracking-widest flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> LOCKDOWN OFF
              </span>
              <span className="text-[11px] font-bold text-emerald-200 mt-0.5">
                Session {primarySession} • {semesterShortDisplay}
              </span>
              <span className="text-[10px] text-emerald-300/80 mt-0.5 font-medium">Unlocked by VC</span>
            </div>
          ) : (
            <>
              <div className="text-[10px] font-bold tracking-wider text-slate-300 uppercase mb-1">
                Session {primarySession} • {semesterShortDisplay}
              </div>
              <div className="flex items-baseline justify-center gap-2 sm:gap-2.5">
                <div className="flex flex-col items-center min-w-[2.5rem]">
                  <span
                    className={`text-xl sm:text-2xl font-black tabular-nums ${
                      isExpired ? 'text-rose-300' : 'text-white'
                    }`}
                  >
                    {String(timeLeft.days).padStart(2, '0')}
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-widest ${
                      isExpired ? 'text-rose-400' : 'text-indigo-300'
                    }`}
                  >
                    Days
                  </span>
                </div>
                <span
                  className={`text-xl sm:text-2xl font-black ${
                    isExpired ? 'text-rose-600/50' : 'text-indigo-600/50'
                  }`}
                >
                  :
                </span>
                <div className="flex flex-col items-center min-w-[2.5rem]">
                  <span
                    className={`text-xl sm:text-2xl font-black tabular-nums ${
                      isExpired ? 'text-rose-300' : 'text-white'
                    }`}
                  >
                    {String(timeLeft.hours).padStart(2, '0')}
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-widest ${
                      isExpired ? 'text-rose-400' : 'text-indigo-300'
                    }`}
                  >
                    Hours
                  </span>
                </div>
                <span
                  className={`text-xl sm:text-2xl font-black ${
                    isExpired ? 'text-rose-600/50' : 'text-indigo-600/50'
                  }`}
                >
                  :
                </span>
                <div className="flex flex-col items-center min-w-[2.5rem]">
                  <span
                    className={`text-xl sm:text-2xl font-black tabular-nums ${
                      isExpired ? 'text-rose-300' : 'text-white'
                    }`}
                  >
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-widest ${
                      isExpired ? 'text-rose-400' : 'text-indigo-300'
                    }`}
                  >
                    Mins
                  </span>
                </div>
                <span
                  className={`text-xl sm:text-2xl font-black ${
                    isExpired ? 'text-rose-600/50' : 'text-indigo-600/50'
                  }`}
                >
                  :
                </span>
                <div className="flex flex-col items-center min-w-[2.5rem]">
                  <span
                    className={`text-xl sm:text-2xl font-black tabular-nums ${
                      isExpired ? 'text-rose-300' : 'text-white'
                    }`}
                  >
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-widest ${
                      isExpired ? 'text-rose-400' : 'text-indigo-300'
                    }`}
                  >
                    Secs
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* INLINE EXPANDED LOCKDOWN LOG SECTION */}
      {showInlineLogs && (
        <div className="mt-3 animate-in fade-in duration-200">
          <LockdownLogSection
            currentSession={primarySession}
            currentSemester={primarySemester}
            onClose={() => setShowInlineLogs(false)}
          />
        </div>
      )}

      {/* EXECUTIVE SESSION & SEMESTER LOCKDOWN MATRIX MODAL */}
      {isMatrixModalOpen && isVC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-800/80 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  {matrixModalTab === 'logs' ? (
                    <History className="w-5 h-5" />
                  ) : matrixModalTab === 'analytics' ? (
                    <BarChart3 className="w-5 h-5" />
                  ) : (
                    <Layers className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>
                      {matrixModalTab === 'logs'
                        ? 'Institutional Lockdown Log & Audit Trail'
                        : matrixModalTab === 'analytics'
                        ? 'Institutional Lockdown Analytics & Disruption Patterns'
                        : 'Institutional Session & Semester Lockdown Matrix'}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                      Vice Chancellor Control
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {matrixModalTab === 'logs'
                      ? 'Historical log of past lockdown events, specific academic sessions, semesters, start timestamps, and admin triggers.'
                      : matrixModalTab === 'analytics'
                      ? 'Visualize the frequency of lockdowns per semester cohort to identify recurring academic disruption patterns.'
                      : 'Configure and inspect granular lockdown states and deadlines for every academic session and semester cohort.'}
                  </p>
                </div>
              </div>

              {/* View Tab Switcher & Close Button */}
              <div className="flex items-center gap-2">
                <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-700/80 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMatrixModalTab('matrix')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      matrixModalTab === 'matrix'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Cohort Matrix</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatrixModalTab('logs')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      matrixModalTab === 'logs'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Lockdown Log ({logCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatrixModalTab('analytics')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      matrixModalTab === 'analytics'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Analytics</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMatrixModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {matrixModalTab === 'logs' ? (
              <div className="p-4 sm:p-5 overflow-auto flex-1">
                <LockdownLogSection
                  currentSession={primarySession}
                  currentSemester={primarySemester}
                />
              </div>
            ) : matrixModalTab === 'analytics' ? (
              <div className="p-4 sm:p-5 overflow-auto flex-1">
                <LockdownAnalyticsSection
                  currentSession={primarySession}
                  currentSemester={primarySemester}
                />
              </div>
            ) : (
              <>
                {/* Quick Batch Bar */}
            <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-slate-300">Quick University-Wide Directives:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    StorageService.setBatchLockdownDisabled(
                      true,
                      availableSessionsList,
                      ['1', '3', '5', '7']
                    );
                    setMatrixVersion((v) => v + 1);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-700/60 font-semibold cursor-pointer transition-colors"
                >
                  Unlock Fall Semesters (1, 3, 5, 7)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    StorageService.setBatchLockdownDisabled(
                      true,
                      availableSessionsList,
                      ['2', '4', '6', '8']
                    );
                    setMatrixVersion((v) => v + 1);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-700/60 font-semibold cursor-pointer transition-colors"
                >
                  Unlock Spring Semesters (2, 4, 6, 8)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    StorageService.setBatchLockdownDisabled(
                      false,
                      availableSessionsList,
                      ['1', '2', '3', '4', '5', '6', '7', '8']
                    );
                    setMatrixVersion((v) => v + 1);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-700/60 font-semibold cursor-pointer transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore Lockdown for All</span>
                </button>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="p-4 sm:p-5 overflow-auto flex-1">
              <div className="border border-slate-700 rounded-xl overflow-hidden shadow-inner">
                <table className="w-full text-xs text-left text-slate-300 border-collapse">
                  <thead className="bg-slate-800 text-slate-300 uppercase tracking-wider font-extrabold text-[11px] border-b border-slate-700">
                    <tr>
                      <th className="py-3 px-3.5 border-r border-slate-700 min-w-[140px]">
                        Academic Session
                      </th>
                      <th className="py-3 px-2.5 border-r border-slate-700 text-center min-w-[120px]">
                        Session Quick Action
                      </th>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                        <th
                          key={sem}
                          className="py-3 px-2 border-r border-slate-700 text-center font-black min-w-[90px]"
                        >
                          Sem {sem}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {availableSessionsList.map((sess) => {
                      const isFocusedSession = sess === primarySession;
                      return (
                        <tr
                          key={sess}
                          className={`hover:bg-slate-800/50 transition-colors ${
                            isFocusedSession ? 'bg-indigo-950/20' : ''
                          }`}
                        >
                          {/* Session Label Column */}
                          <td className="py-3 px-3.5 font-bold text-white border-r border-slate-800">
                            <div className="flex items-center gap-2">
                              <span>Session {sess}</span>
                              {isFocusedSession && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-600 text-white">
                                  Current Focus
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                              8 Semester Cohorts
                            </div>
                          </td>

                          {/* Session Quick Actions Column */}
                          <td className="py-2 px-2.5 border-r border-slate-800 text-center">
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  StorageService.setLockdownDisabled(true, sess, 'ALL', true);
                                  setMatrixVersion((v) => v + 1);
                                }}
                                className="px-2 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 text-[10px] font-bold cursor-pointer transition-colors flex items-center justify-center gap-1"
                                title={`Turn lockdown OFF for all 8 semesters of Session ${sess}`}
                              >
                                <Unlock className="w-3 h-3" />
                                <span>Unlock All 8</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  StorageService.setLockdownDisabled(false, sess, 'ALL', true);
                                  setMatrixVersion((v) => v + 1);
                                }}
                                className="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700 text-[10px] font-bold cursor-pointer transition-colors flex items-center justify-center gap-1"
                                title={`Re-enforce lockdown for all 8 semesters of Session ${sess}`}
                              >
                                <Lock className="w-3 h-3" />
                                <span>Lock All 8</span>
                              </button>
                            </div>
                          </td>

                          {/* Semesters 1 to 8 Columns */}
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((semNum) => {
                            const semStr = semNum.toString();
                            const isCellUnlocked = StorageService.getLockdownDisabled(sess, semStr);
                            const isCellExpired = StorageService.isSystemDeadlineExpired(sess, semStr);
                            const isCurrentCell =
                              sess === primarySession &&
                              (primarySemester === semStr ||
                                isAllSemesters ||
                                (selectedSemesters && selectedSemesters.includes(semStr)));

                            return (
                              <td
                                key={semNum}
                                className={`py-2 px-1.5 border-r border-slate-800 text-center align-middle ${
                                  isCurrentCell ? 'bg-indigo-950/40' : ''
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Toggle this specific session and semester
                                    StorageService.setLockdownDisabled(!isCellUnlocked, sess, semStr, false);
                                    setMatrixVersion((v) => v + 1);
                                  }}
                                  className={`w-full py-1.5 px-1 rounded-md text-[10px] font-bold transition-all border flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-2xs ${
                                    isCellUnlocked
                                      ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border-emerald-600 ring-1 ring-emerald-500/30'
                                      : isCellExpired
                                      ? 'bg-rose-950 hover:bg-rose-900 text-rose-200 border-rose-700'
                                      : 'bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border-indigo-700'
                                  }`}
                                  title={`Click to toggle lockdown for Session ${sess} Semester ${semNum}`}
                                >
                                  {isCellUnlocked ? (
                                    <>
                                      <span className="flex items-center gap-1 text-emerald-400">
                                        <Unlock className="w-3 h-3" />
                                        <span>UNLOCKED</span>
                                      </span>
                                      <span className="text-[8px] text-emerald-300/70 font-normal">
                                        Lockdown OFF
                                      </span>
                                    </>
                                  ) : isCellExpired ? (
                                    <>
                                      <span className="flex items-center gap-1 text-rose-400">
                                        <Lock className="w-3 h-3" />
                                        <span>LOCKED</span>
                                      </span>
                                      <span className="text-[8px] text-rose-300/70 font-normal">
                                        Expired
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="flex items-center gap-1 text-indigo-300">
                                        <Timer className="w-3 h-3" />
                                        <span>ACTIVE</span>
                                      </span>
                                      <span className="text-[8px] text-indigo-300/70 font-normal">
                                        Controlled
                                      </span>
                                    </>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legend & Help */}
              <div className="mt-4 p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-slate-300 font-semibold">
                      Unlocked (Lockdown OFF): Department can edit without restrictions
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-indigo-500" />
                    <span className="text-slate-300 font-semibold">
                      Active: Controlled by session/semester countdown timer
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="text-slate-300 font-semibold">
                      Locked: Deadline expired, forms sealed
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 font-medium italic">
                  Tip: Click on any semester cell above to toggle its lockdown state independently.
                </div>
              </div>
            </div>
          </>
        )}

            {/* Modal Footer */}
            <div className="p-4 bg-slate-800/80 border-t border-slate-700 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {matrixModalTab === 'logs'
                  ? 'Lockdown events record administrative changes in real-time and persist across sessions.'
                  : 'All changes sync automatically to Firebase and enforce in real-time across the university.'}
              </span>
              <button
                type="button"
                onClick={() => setIsMatrixModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm"
              >
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
