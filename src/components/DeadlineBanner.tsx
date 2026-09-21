import React, { useState, useEffect } from 'react';
import { Timer, Edit3, Save, X, Unlock, Lock, ShieldCheck } from 'lucide-react';
import { StorageService } from '../services/storageService';

interface Props {
  currentSession: string;
  semesterFilter?: string;
  isVC?: boolean;
}

export const DeadlineBanner: React.FC<Props> = ({ currentSession, semesterFilter = '1', isVC = false }) => {
  const [targetDate, setTargetDate] = useState<Date>(() => {
    const stored = StorageService.getSystemDeadline();
    if (stored) return new Date(stored);
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    return defaultDate;
  });

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDateStr, setEditDateStr] = useState('');
  const [isLockdownDisabled, setIsLockdownDisabled] = useState<boolean>(() => StorageService.getLockdownDisabled());

  useEffect(() => {
    const handleDeadlineUpdated = (e: any) => {
      setIsLockdownDisabled(StorageService.getLockdownDisabled());
      if (e?.detail) {
        setTargetDate(new Date(e.detail));
      } else {
        const stored = StorageService.getSystemDeadline();
        if (stored) {
          setTargetDate(new Date(stored));
        } else {
          const defaultDate = new Date();
          defaultDate.setDate(defaultDate.getDate() + 3);
          setTargetDate(defaultDate);
        }
      }
    };
    
    window.addEventListener('mnsuet_deadline_updated', handleDeadlineUpdated);
    return () => window.removeEventListener('mnsuet_deadline_updated', handleDeadlineUpdated);
  }, []);

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
    setIsEditing(true);
  };
  
  const handleSave = () => {
    if (!editDateStr) return;
    const newTarget = new Date(editDateStr);
    setTargetDate(newTarget);
    StorageService.setSystemDeadline(newTarget.toISOString());
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setIsEditing(false);
  };

  const toggleLockdown = (turnDisabled: boolean) => {
    StorageService.setLockdownDisabled(turnDisabled);
    setIsLockdownDisabled(turnDisabled);
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

  return (
    <div className={`rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden shadow-xl border ${bgStyle}`}>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay pointer-events-none" />
      <div className={`absolute top-0 right-0 p-16 blur-[100px] rounded-full pointer-events-none ${isLockdownDisabled ? 'bg-emerald-500/10' : isExpired ? 'bg-rose-500/10' : 'bg-indigo-500/10'}`} />

      <div className="flex items-center gap-4 z-10 flex-1 min-w-0">
        <div className={`p-3 rounded-lg shrink-0 border ${iconBgStyle}`}>
          {isLockdownDisabled ? (
            <Unlock className="w-6 h-6 text-emerald-300 animate-pulse" />
          ) : isExpired ? (
            <Lock className="w-6 h-6 text-rose-300" />
          ) : (
            <Timer className="w-6 h-6 text-indigo-300 animate-pulse" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={`text-lg font-black tracking-wide truncate ${isLockdownDisabled ? 'text-emerald-50' : isExpired ? 'text-rose-50' : 'text-indigo-50'}`}>
              {isLockdownDisabled
                ? 'LMS Portal Lockdown Lifted (Unlocked by VC)'
                : isExpired
                ? 'LMS Portal Lockdown Active'
                : 'LMS Portal Lock Deadline'}
            </h2>

            {isVC && !isEditing && (
              <div className="flex flex-wrap items-center gap-2">
                {/* VC Toggle Lockdown Button */}
                {isLockdownDisabled ? (
                  <button
                    onClick={() => toggleLockdown(false)}
                    className="px-2.5 py-1.5 flex items-center gap-1.5 rounded-md text-xs font-bold transition-all shadow-sm border bg-amber-600 hover:bg-amber-500 text-white border-amber-500 ring-1 ring-amber-400/50"
                    title="Re-enforce portal system lockdown"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Turn Lockdown ON</span>
                  </button>
                ) : (
                  <button
                    onClick={() => toggleLockdown(true)}
                    className="px-2.5 py-1.5 flex items-center gap-1.5 rounded-md text-xs font-bold transition-all shadow-sm border bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 ring-1 ring-emerald-400/50"
                    title="Turn OFF lockdown and allow HODs to enter results freely"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Turn Lockdown OFF</span>
                  </button>
                )}

                {/* Edit / Extend Deadline Button */}
                <button 
                  onClick={handleEditClick}
                  className={`px-2.5 py-1.5 flex items-center gap-1.5 rounded-md text-xs font-bold transition-all shadow-sm border ${
                    isLockdownDisabled
                      ? 'bg-slate-800 hover:bg-slate-700 text-emerald-200 border-emerald-600/50'
                      : isExpired
                      ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 ring-1 ring-rose-400/50'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 ring-1 ring-indigo-400/50'
                  }`}
                  title={isExpired ? "Extend Deadline" : "Change Deadline"}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isExpired ? "Extend Deadline" : "Edit Deadline"}</span>
                </button>
              </div>
            )}
          </div>

          <p className={`text-[11px] font-medium leading-relaxed max-w-xl ${isLockdownDisabled ? 'text-emerald-200' : isExpired ? 'text-rose-200' : 'text-indigo-200'}`}>
            {isLockdownDisabled ? (
              isVC ? (
                <>Vice Chancellor Override Active: System lockdown is currently turned <strong>OFF</strong>. HODs and Coordinators can submit and edit LMS result entries without deadline restrictions.</>
              ) : (
                <>The Vice Chancellor has turned <strong>OFF</strong> system lockdown. LMS result entry forms are unlocked for submission and edits across Academic Session {currentSession} {semesterFilter ? `Semester ${semesterFilter}` : ''}.</>
              )
            ) : isVC ? (
              <>Academic Session {currentSession} {semesterFilter ? `Semester ${semesterFilter}` : ''} finalization. All concerned HODs must submit genuine results before system lockdown.</>
            ) : (
              <>
                The Vice Chancellor has given you this time to complete the LMS Result Uploads for Academic Session {currentSession} {semesterFilter ? `Semester ${semesterFilter}` : ''}.
                All concerned HODs must submit genuine results before system lockdown.
              </>
            )}
          </p>
          
          {isEditing && (
            <div className={`mt-3 flex flex-wrap items-center gap-2 p-2 rounded-lg border max-w-sm ${isLockdownDisabled ? 'bg-emerald-950/80 border-emerald-700/50' : isExpired ? 'bg-rose-950/80 border-rose-700/50' : 'bg-indigo-950/80 border-indigo-700/50'}`}>
              <input 
                type="datetime-local" 
                value={editDateStr}
                onChange={(e) => setEditDateStr(e.target.value)}
                className={`text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-emerald-500 flex-1 ${isLockdownDisabled ? 'bg-emerald-900 border border-emerald-700' : isExpired ? 'bg-rose-900 border border-rose-700' : 'bg-indigo-900 border border-indigo-700'}`}
              />
              <button onClick={handleSave} className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors flex items-center gap-1" title="Save Deadline">
                <Save className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-wider pr-1">Save</span>
              </button>
              <button onClick={handleCancel} className="p-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors" title="Cancel">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className={`z-10 px-4 py-3 rounded-xl border flex items-baseline justify-center gap-2 sm:gap-3 shrink-0 ${isLockdownDisabled ? 'bg-emerald-950/70 border-emerald-700/80' : isExpired ? 'bg-rose-950/60 border-rose-800/80' : 'bg-indigo-950/60 border-indigo-800/80'}`}>
        {isLockdownDisabled ? (
          <div className="flex flex-col items-center justify-center px-2 py-1">
            <span className="text-xs font-black text-emerald-300 uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> LOCKDOWN OFF
            </span>
            <span className="text-[10px] font-bold text-emerald-200/80 tracking-wider">Unlocked by VC</span>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center min-w-[3rem]">
              <span className={`text-xl sm:text-2xl font-black tabular-nums ${isExpired ? 'text-rose-300' : 'text-white'}`}>
                {String(timeLeft.days).padStart(2, '0')}
              </span>
              <span className={`text-[9px] font-bold uppercase tracking-widest ${isExpired ? 'text-rose-400' : 'text-indigo-300'}`}>Days</span>
            </div>
            <span className={`text-xl sm:text-2xl font-black ${isExpired ? 'text-rose-600/50' : 'text-indigo-600/50'}`}>:</span>
            <div className="flex flex-col items-center min-w-[3rem]">
              <span className={`text-xl sm:text-2xl font-black tabular-nums ${isExpired ? 'text-rose-300' : 'text-white'}`}>
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className={`text-[9px] font-bold uppercase tracking-widest ${isExpired ? 'text-rose-400' : 'text-indigo-300'}`}>Hours</span>
            </div>
            <span className={`text-xl sm:text-2xl font-black ${isExpired ? 'text-rose-600/50' : 'text-indigo-600/50'}`}>:</span>
            <div className="flex flex-col items-center min-w-[3rem]">
              <span className={`text-xl sm:text-2xl font-black tabular-nums ${isExpired ? 'text-rose-300' : 'text-white'}`}>
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className={`text-[9px] font-bold uppercase tracking-widest ${isExpired ? 'text-rose-400' : 'text-indigo-300'}`}>Mins</span>
            </div>
            <span className={`text-xl sm:text-2xl font-black ${isExpired ? 'text-rose-600/50' : 'text-indigo-600/50'}`}>:</span>
            <div className="flex flex-col items-center min-w-[3rem]">
              <span className={`text-xl sm:text-2xl font-black tabular-nums ${isExpired ? 'text-rose-300' : 'text-white'}`}>
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className={`text-[9px] font-bold uppercase tracking-widest ${isExpired ? 'text-rose-400' : 'text-indigo-300'}`}>Secs</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
