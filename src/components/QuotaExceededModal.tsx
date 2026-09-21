import React, { useEffect, useState } from 'react';
import { AlertTriangle, XCircle, ShieldAlert } from 'lucide-react';

export const QuotaExceededModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [details, setDetails] = useState({
    title: '⚠️ Write Limit Exceeded',
    message: 'The Firestore daily write limit has been exceeded. Your submission cannot be saved at this time. Please try again later.',
  });

  useEffect(() => {
    const handleShowQuota = (e: any) => {
      if (e?.detail) {
        setDetails({
          title: e.detail.title || '⚠️ Write Limit Exceeded',
          message:
            e.detail.message ||
            'The Firestore daily write limit has been exceeded. Your submission cannot be saved at this time. Please try again later.',
        });
      }
      setIsOpen(true);
    };

    window.addEventListener('mnsuet_show_quota_popup', handleShowQuota);
    return () => {
      window.removeEventListener('mnsuet_show_quota_popup', handleShowQuota);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border-2 border-red-500 overflow-hidden text-slate-900">
        {/* Header Bar */}
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-7 w-7 text-amber-200 animate-pulse" />
            <h3 className="text-xl font-bold tracking-tight">{details.title}</h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1 text-red-100 hover:bg-red-700 hover:text-white transition-colors"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900">
            <AlertTriangle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
            <div className="text-sm font-medium leading-relaxed">
              {details.message}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <p className="font-semibold text-slate-800">Why did this happen?</p>
            <p>
              The application's cloud database write quota for today has reached its maximum daily allocation limit.
            </p>
            <p className="text-red-700 font-semibold">
              🔒 Local and remote save operations are strictly paused to protect data integrity and prevent unsynced records.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-4 flex justify-end border-t border-slate-200">
          <button
            onClick={() => setIsOpen(false)}
            className="px-6 py-2.5 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-md hover:shadow-lg"
          >
            Close & Reject Submission
          </button>
        </div>
      </div>
    </div>
  );
};
