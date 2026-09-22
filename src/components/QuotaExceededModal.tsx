import React, { useEffect, useState } from 'react';
import { AlertTriangle, XCircle, ShieldCheck, ExternalLink, Database } from 'lucide-react';

const FIREBASE_UPGRADE_URL =
  'https://console.firebase.google.com/project/hrcv-2d7ce/firestore/databases/ai-studio-mnsuetlmsresultu-e2136163-8fbb-42d0-a2cb-ea06807df2ce/data?openUpgradeDialog=true';

export const QuotaExceededModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [details, setDetails] = useState({
    title: 'Cloud Write Quota Reached (Spark Free Tier)',
    message:
      'The Firebase Firestore daily write unit limit (40,000 units/day) for this shared quota free-tier project has been reached.',
  });

  useEffect(() => {
    const handleShowQuota = (e: any) => {
      if (e?.detail) {
        setDetails({
          title: e.detail.title || 'Cloud Write Quota Reached (Spark Free Tier)',
          message:
            e.detail.message ||
            'The Firebase Firestore daily write unit limit (40,000 units/day) for this shared quota free-tier project has been reached.',
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
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-amber-500/50 overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Header Bar */}
        <div className="bg-amber-600 dark:bg-amber-700 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-amber-500/50 rounded-lg">
              <Database className="h-6 w-6 text-amber-100" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight">{details.title}</h3>
              <p className="text-xs text-amber-100/90 font-medium">Local & SQLite Database Active</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1 text-amber-100 hover:bg-amber-700 hover:text-white transition-colors cursor-pointer"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-950 dark:text-amber-200 text-sm leading-relaxed">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{details.message}</p>
              <p className="text-xs text-amber-800 dark:text-amber-300/80 mt-1">
                Firestore free quotas automatically reset at 00:00 UTC (tomorrow). Cloud sync will resume once reset.
              </p>
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-950 dark:text-emerald-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Data Protection Guarantee Active</span>
            </div>
            <p className="leading-relaxed">
              Your grades, LMS submissions, and edits are <strong>fully preserved</strong> in the system's Local Storage and server-side SQLite Database. No work is lost.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <p className="font-semibold text-slate-800 dark:text-slate-200">To remove write quotas permanently:</p>
            <p>
              You can upgrade your Google Cloud/Firebase project from the Spark free tier to the Blaze plan to unlock unlimited daily writes.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-700">
          <a
            href={FIREBASE_UPGRADE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <span>Firebase Console</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={() => setIsOpen(false)}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            Continue in Local & SQLite Mode
          </button>
        </div>
      </div>
    </div>
  );
};

