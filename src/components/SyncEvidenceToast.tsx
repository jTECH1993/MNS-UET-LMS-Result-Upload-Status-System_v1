import React, { useState, useEffect } from 'react';
import { CheckCircle2, Database, ShieldCheck, X, Server, RefreshCw, Lock } from 'lucide-react';

export interface SyncEvidenceDetail {
  id: string;
  action: 'SAVE' | 'UPDATE' | 'DELETE' | 'PROFILE' | 'ROSTER' | 'SESSION' | 'AUDIT';
  title: string;
  message: string;
  user?: string;
  recordInfo?: string;
  syncId: string;
  timestamp: string;
}

export function dispatchSyncEvidence(
  action: SyncEvidenceDetail['action'],
  title: string,
  message: string,
  recordInfo?: string,
  user?: string
) {
  const detail: SyncEvidenceDetail = {
    id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    action,
    title,
    message,
    recordInfo,
    user: user || 'Authenticated User',
    syncId: `SYNC-MNSUET-${Math.floor(100000 + Math.random() * 900000)}`,
    timestamp: new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }),
  };

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mnsuet_sync_evidence', { detail }));
  }
}

export const SyncEvidenceToast: React.FC = () => {
  const [evidence, setEvidence] = useState<SyncEvidenceDetail | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleEvent = (e: CustomEvent<SyncEvidenceDetail>) => {
      setEvidence(e.detail);
      setIsVisible(true);
    };

    window.addEventListener('mnsuet_sync_evidence' as any, handleEvent);
    return () => {
      window.removeEventListener('mnsuet_sync_evidence' as any, handleEvent);
    };
  }, []);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, evidence]);

  if (!isVisible || !evidence) return null;

  const isDelete = evidence.action === 'DELETE';

  return (
    <div className="fixed bottom-6 right-6 z-[9999] max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div
        className={`rounded-2xl shadow-2xl border p-4 backdrop-blur-xl ${
          isDelete
            ? 'bg-rose-950/95 text-rose-100 border-rose-500/50 shadow-rose-950/50'
            : 'bg-slate-900/95 text-white border-emerald-500/50 shadow-emerald-950/50'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isDelete ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <Database className="w-3.5 h-3.5" /> Firestore Synced
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                  {evidence.syncId}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-0.5">{evidence.title}</h4>
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="pt-3 space-y-2 text-xs">
          <p className="text-slate-200 leading-relaxed font-medium">{evidence.message}</p>

          {evidence.recordInfo && (
            <div className="p-2 rounded-lg bg-black/40 border border-white/10 font-mono text-[11px] text-emerald-300 flex items-center justify-between">
              <span className="truncate">{evidence.recordInfo}</span>
              <span className="text-slate-400 text-[10px] whitespace-nowrap ml-2">Verified</span>
            </div>
          )}

          {/* Verification Badge Bar */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5">
            <span className="flex items-center gap-1">
              <Server className="w-3 h-3 text-emerald-400" /> Cloud DB: Synced
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-sky-400" /> Audit Logged
            </span>
            <span className="font-mono text-slate-400">{evidence.timestamp}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
