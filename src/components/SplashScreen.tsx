import React, { useEffect, useState } from 'react';
import { MnsUetLogo } from './MnsUetLogo';
import { ShieldCheck, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';

interface Props {
  onFinish: () => void;
}

export const SplashScreen: React.FC<Props> = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing University Portal...');

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setProgress(35);
      setStatusText('Connecting to MNS-UET Cloud Storage & Security Gateway...');
    }, 400);

    const timer2 = setTimeout(() => {
      setProgress(75);
      setStatusText('Loading Academic Monitoring Modules (LMS Results, QEC, Rosters)...');
    }, 900);

    const timer3 = setTimeout(() => {
      setProgress(100);
      setStatusText('Central Academic Monitoring Portal Ready.');
    }, 1400);

    const finishTimer = setTimeout(() => {
      onFinish();
    }, 1900);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 select-none overflow-hidden">
      {/* Subtle Background Glow Rings */}
      <div className="absolute w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute w-72 h-72 bg-blue-600/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="relative z-10 max-w-md w-full flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
        {/* Crest Logo Container */}
        <div className="relative">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white p-3 shadow-2xl border-4 border-emerald-500/80 flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
            <MnsUetLogo className="w-full h-full" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1.5 rounded-full shadow-lg border-2 border-slate-950">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        {/* Institutional Titles */}
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-1.5 bg-emerald-950/80 text-emerald-400 border border-emerald-700/50 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase">
            <span>University Institutional Oversight</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
            Muhammad Nawaz Sharif University of Engineering & Technology
          </h1>
          <p className="text-sm font-semibold text-emerald-400 tracking-wide">
            Multan, Punjab, Pakistan
          </p>
          <div className="pt-2.5 border-t border-slate-800 space-y-1.5">
            <h2 className="text-base sm:text-lg font-black text-slate-100">
              Central Academic &amp; Institutional Monitoring Portal
            </h2>
            <div className="inline-flex items-center gap-1.5 bg-emerald-950/90 text-emerald-300 text-[11px] font-semibold px-3 py-1 rounded-full border border-emerald-700/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Active Governance Task: LMS Result Upload Status</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Enterprise Role-Based Department Isolation &amp; Executive Oversight
            </p>
          </div>
        </div>

        {/* Progress Bar & Status */}
        <div className="w-full space-y-2 pt-2">
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700 p-0.5">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-400 font-mono tracking-tight animate-pulse h-4">
            {statusText}
          </p>
        </div>

        {/* Manual Enter / Skip Button */}
        <div className="pt-4 w-full">
          <button
            type="button"
            onClick={onFinish}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-lg shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
          >
            <span>Enter Central Monitoring Portal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Restricted to Authorized University Personnel</span>
        </div>
      </div>
    </div>
  );
};
