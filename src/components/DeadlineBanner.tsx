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
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
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
    <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden shadow-xl border border-indigo-800">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay pointer-events-none" />
      <div className="absolute top-0 right-0 p-16 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="flex items-center gap-4 z-10 flex-1 min-w-0">
        <div className="p-3 bg-indigo-800 rounded-lg shrink-0 border border-indigo-600">
          <Timer className="w-6 h-6 text-indigo-300 animate-pulse" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black tracking-wide text-indigo-50 truncate">LMS Portal Lock Deadline</h2>
            {isVC && !isEditing && (
              <button 
                onClick={handleEditClick}
                className="p-1 hover:bg-indigo-800 rounded-md text-indigo-400 hover:text-indigo-200 transition-colors"
                title="Change Deadline"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-[11px] text-indigo-200 font-medium leading-relaxed max-w-xl">
            Academic Session {currentSession} {semesterFilter ? `Semester ${semesterFilter}` : ''} finalization.
            All concerned HODs must submit genuine results before system lockdown.
          </p>
          
          {isEditing && (
            <div className="mt-3 flex items-center gap-2 bg-indigo-950/80 p-2 rounded-lg border border-indigo-700/50 max-w-sm">
              <input 
                type="datetime-local" 
                value={editDateStr}
                onChange={(e) => setEditDateStr(e.target.value)}
                className="bg-indigo-900 border border-indigo-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-emerald-500 flex-1"
              />
              <button onClick={handleSave} className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors" title="Save Deadline">
                <Save className="w-4 h-4" />
              </button>
              <button onClick={handleCancel} className="p-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors" title="Cancel">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="z-10 bg-indigo-950/60 px-4 py-3 rounded-xl border border-indigo-800/80 flex items-baseline justify-center gap-2 sm:gap-3 shrink-0">
        <div className="flex flex-col items-center min-w-[3rem]">
          <span className="text-xl sm:text-2xl font-black tabular-nums text-white">
            {String(timeLeft.days).padStart(2, '0')}
          </span>
          <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">Days</span>
        </div>
        <span className="text-xl sm:text-2xl font-black text-indigo-600/50">:</span>
        <div className="flex flex-col items-center min-w-[3rem]">
          <span className="text-xl sm:text-2xl font-black tabular-nums text-white">
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">Hours</span>
        </div>
        <span className="text-xl sm:text-2xl font-black text-indigo-600/50">:</span>
        <div className="flex flex-col items-center min-w-[3rem]">
          <span className="text-xl sm:text-2xl font-black tabular-nums text-white">
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">Mins</span>
        </div>
        <span className="text-xl sm:text-2xl font-black text-indigo-600/50">:</span>
        <div className="flex flex-col items-center min-w-[3rem]">
          <span className="text-xl sm:text-2xl font-black tabular-nums text-white">
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
          <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">Secs</span>
        </div>
      </div>
    </div>
  );
};
