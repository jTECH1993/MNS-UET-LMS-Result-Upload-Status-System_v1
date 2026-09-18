import React, { useState, useEffect } from 'react';
import { MnsUetLogo } from './MnsUetLogo';
import { JtechLogo } from './JtechLogo';
import { ShieldCheck, Database, CheckCircle2, Sparkles, Layers } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minDurationMs = 1500,
}) => {
  const [progress, setProgress] = useState<number>(10);
  const [currentStep, setCurrentStep] = useState<string>('Initializing Institutional Security...');
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  useEffect(() => {
    const steps = [
      { pct: 28, label: 'Loading SQLite & Firestore Multi-Database Store...' },
      { pct: 55, label: 'Syncing University Academic Roster & Sessions...' },
      { pct: 82, label: 'Securing Role-Based Authentication Gateway...' },
      { pct: 100, label: 'System Ready. Loading Dashboard...' },
    ];

    const timer1 = setTimeout(() => {
      setProgress(steps[0].pct);
      setCurrentStep(steps[0].label);
    }, 280);

    const timer2 = setTimeout(() => {
      setProgress(steps[1].pct);
      setCurrentStep(steps[1].label);
    }, 650);

    const timer3 = setTimeout(() => {
      setProgress(steps[2].pct);
      setCurrentStep(steps[2].label);
    }, 1050);

    const timer4 = setTimeout(() => {
      setProgress(steps[3].pct);
      setCurrentStep(steps[3].label);
    }, 1350);

    const timerEnd = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        onComplete();
      }, 400);
    }, minDurationMs);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timerEnd);
    };
  }, [minDurationMs, onComplete]);

  return (
    <div
      id="app-splash-screen"
      className={`fixed inset-0 z-50 flex flex-col justify-between items-center bg-radial from-slate-900 via-slate-950 to-black text-white p-6 transition-opacity duration-400 select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header Badge */}
      <div className="w-full max-w-md pt-4 flex justify-between items-center relative z-10">
        <div className="inline-flex items-center gap-2 bg-slate-900/90 border border-slate-800/80 px-3 py-1 rounded-full text-[11px] font-semibold text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>MNS-UET Central Monitoring System</span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 tracking-wider">v2.5 Enterprise</span>
      </div>

      {/* Main Center Content */}
      <div className="flex flex-col items-center text-center max-w-md w-full px-4 relative z-10 my-auto">
        {/* Institutional Crest with Luminous Ring */}
        <div className="relative mb-6">
          <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full opacity-30 blur-md animate-pulse"></div>
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white p-2.5 shadow-2xl border-2 border-emerald-400/80 flex items-center justify-center relative">
            <MnsUetLogo className="w-full h-full" />
          </div>
        </div>

        {/* University Title & Portal Subtitle */}
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
          Muhammad Nawaz Sharif
        </h1>
        <p className="text-sm sm:text-base font-bold text-emerald-400 tracking-wide mt-0.5">
          University of Engineering &amp; Technology, Multan
        </p>

        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 text-xs font-semibold">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>OBE &amp; LMS Result Upload Status Portal</span>
        </div>

        {/* Loading Progress Bar */}
        <div className="w-full mt-8 bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-xs">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="font-medium text-slate-300 truncate max-w-[260px] text-left">
              {currentStep}
            </span>
            <span className="font-mono font-bold text-emerald-400 ml-2">{progress}%</span>
          </div>

          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-300 rounded-full transition-all duration-300 ease-out shadow-xs shadow-emerald-500/50"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              ABAC Protected
            </span>
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              Multi-DB Real-time Sync
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              OBE Compliant
            </span>
          </div>
        </div>
      </div>

      {/* Footer: Small, subtle and elegant "Created by Jtech Solutions" credit with logo */}
      <div className="w-full max-w-md pb-4 pt-2 flex flex-col items-center justify-center gap-1.5 relative z-10 border-t border-slate-900/80">
        <div className="inline-flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
          <div className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 flex items-center justify-center">
            <JtechLogo className="w-full h-full" />
          </div>
          <span className="text-[11px] sm:text-xs text-slate-400 font-medium tracking-wide">
            Created by <span className="font-bold text-slate-200">Jtech Solutions</span>
          </span>
        </div>
        <p className="text-[10px] text-slate-600">
          Official Institutional Academic Portal &copy; {new Date().getFullYear()} MNS-UET Multan
        </p>
      </div>
    </div>
  );
};
