import React, { useState, useEffect } from 'react';
import { Timer, Edit3, Save, X } from 'lucide-react';
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
  
  useEffect(() => {
    const handleDeadlineUpdated = (e: any) => {
      if (e.detail) {
        setTargetDate(new Date(e.detail));
      } else {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 3);
        setTargetDate(defaultDate);
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
    // Format to YYYY-MM-DDThh:mm
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

  return (
    <div className={`rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden shadow-xl border ${isExpired ? 'bg-gradient-to-br from-rose-900 to-rose-950 border-rose-800' : 'bg-gradient-to-br from-indigo-900 to-indigo-950 border-indigo-800'}`}>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay pointer-events-none" />
      <div className={`absolute top-0 right-0 p-16 blur-[100px] rounded-full pointer-events-none ${isExpired ? 'bg-rose-500/10' : 'bg-indigo-500/10'}`} />

      <div className="flex items-center gap-4 z-10 flex-1 min-w-0">
        <div className={`p-3 rounded-lg shrink-0 border ${isExpired ? 'bg-rose-800 border-rose-600' : 'bg-indigo-800 border-indigo-600'}`}>
          <Timer className={`w-6 h-6 ${isExpired ? 'text-rose-300' : 'text-indigo-300 animate-pulse'}`} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={`text-lg font-black tracking-wide truncate ${isExpired ? 'text-rose-50' : 'text-indigo-50'}`}>
              {isExpired ? 'LMS Portal Lockdown Active' : 'LMS Portal Lock Deadline'}
            </h2>
            {isVC && !isEditing && (
              <button 
                onClick={handleEditClick}
                className={`px-2.5 py-1.5 flex items-center gap-1.5 rounded-md text-xs font-bold transition-all shadow-sm border ${isExpired ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 ring-1 ring-rose-400/50' : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 ring-1 ring-indigo-400/50'}`}
                title={isExpired ? "Extend Deadline" : "Change Deadline"}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isExpired ? "Extend Deadline" : "Edit Deadline"}</span>
              </button>
            )}
          </div>
          <p className={`text-[11px] font-medium leading-relaxed max-w-xl ${isExpired ? 'text-rose-200' : 'text-indigo-200'}`}>
            {isVC ? (
              <>Academic Session {currentSession} {semesterFilter ? `Semester ${semesterFilter}` : ''} finalization. All concerned HODs must submit genuine results before system lockdown.</>
            ) : (
              <>
                The Vice Chancellor has given you this time to complete the LMS Result Uploads for Academic Session {currentSession} {semesterFilter ? `Semester ${semesterFilter}` : ''}.
                All concerned HODs must submit genuine results before system lockdown.
              </>
            )}
          </p>
          
          {isEditing && (
            <div className={`mt-3 flex flex-wrap items-center gap-2 p-2 rounded-lg border max-w-sm ${isExpired ? 'bg-rose-950/80 border-rose-700/50' : 'bg-indigo-950/80 border-indigo-700/50'}`}>
              <input 
                type="datetime-local" 
                value={editDateStr}
                onChange={(e) => setEditDateStr(e.target.value)}
                className={`text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-emerald-500 flex-1 ${isExpired ? 'bg-rose-900 border border-rose-700' : 'bg-indigo-900 border border-indigo-700'}`}
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
      
      <div className={`z-10 px-4 py-3 rounded-xl border flex items-baseline justify-center gap-2 sm:gap-3 shrink-0 ${isExpired ? 'bg-rose-950/60 border-rose-800/80' : 'bg-indigo-950/60 border-indigo-800/80'}`}>
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
      </div>
    </div>
  );
};
