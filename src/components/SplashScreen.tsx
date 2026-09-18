import React, { useState, useEffect } from 'react';
import { MnsUetLogo } from './MnsUetLogo';
import { JtechLogo } from './JtechLogo';
import { ShieldCheck, Database, CheckCircle2, Sparkles, Layers, Cpu, Server } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minDurationMs = 1600,
}) => {
  const [progress, setProgress] = useState<number>(10);
  const [currentStep, setCurrentStep] = useState<string>('Initializing Institutional Security...');
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  useEffect(() => {
    const steps = [
      { pct: 28, label: 'Connecting Cloud Firestore & SQLite Multi-Database Engine...' },
      { pct: 55, label: 'Loading University Academic Roster & Departmental Structure...' },
      { pct: 82, label: 'Verifying ABAC Role Credentials & OBE Compliance Standards...' },
      { pct: 100, label: 'System Ready. Loading Executive Portal...' },
    ];

    const timer1 = setTimeout(() => {
      setProgress(steps[0].pct);
      setCurrentStep(steps[0].label);
    }, 300);

    const timer2 = setTimeout(() => {
      setProgress(steps[1].pct);
      setCurrentStep(steps[1].label);
    }, 700);

    const timer3 = setTimeout(() => {
      setProgress(steps[2].pct);
      setCurrentStep(steps[2].label);
    }, 1100);

    const timer4 = setTimeout(() => {
      setProgress(steps[3].pct);
      setCurrentStep(steps[3].label);
    }, 1450);

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
      className={`fixed inset-0 z-[99999] flex flex-col justify-between items-center bg-[#07090e] text-white p-6 transition-opacity duration-400 select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background glowing ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-600/20 via-teal-500/10 to-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Badge */}
      <div className="w-full max-w-lg pt-4 flex justify-between items-center relative z-10">
        <div className="inline-flex items-center gap-2 bg-slate-900/90 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-[11px] font-bold text-emerald-400 shadow-lg shadow-emerald-950/40">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>MNS-UET Central Academic Portal</span>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800">
          v2.5 Enterprise
        </span>
      </div>

      {/* Main Center Content */}
      <div className="flex flex-col items-center text-center max-w-lg w-full px-4 relative z-10 my-auto">
        {/* Institutional Crest with Luminous Ring */}
        <div className="relative mb-6">
          <div className="absolute -inset-3 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 rounded-full opacity-40 blur-lg animate-pulse" />
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-slate-950 p-3 shadow-2xl border-2 border-emerald-400 flex items-center justify-center relative backdrop-blur-md">
            <MnsUetLogo className="w-full h-full" />
          </div>
        </div>

        {/* University Title & Broad General System Portal Name */}
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
          Muhammad Nawaz Sharif
        </h1>
        <p className="text-sm sm:text-base font-bold text-emerald-400 tracking-wide mt-0.5">
          University of Engineering &amp; Technology, Multan
        </p>

        {/* General Portal Name Badge */}
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-lg shadow-emerald-950/50">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Central Academic Automation &amp; Governance System</span>
        </div>

        <p className="text-[11px] text-slate-400 mt-2 max-w-sm">
          Integrated Academic Operations • OBE Curriculum &amp; Examination Oversight • Multi-Departmental Analytics
        </p>

        {/* Loading Progress Card */}
        <div className="w-full mt-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex justify-between items-center text-xs mb-2.5">
            <span className="font-medium text-slate-300 truncate max-w-[300px] text-left flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              {currentStep}
            </span>
            <span className="font-mono font-black text-emerald-400 ml-2">{progress}%</span>
          </div>

          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-400 rounded-full transition-all duration-300 ease-out shadow-xs shadow-emerald-500/50"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Sub Features Indicators */}
          <div className="mt-3.5 flex items-center justify-between text-[11px] text-slate-400 pt-2.5 border-t border-slate-800/80">
            <span className="flex items-center gap-1 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              ABAC Protected
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <Database className="w-3.5 h-3.5 text-sky-400" />
              Multi-DB Sync
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              OBE Compliant
            </span>
          </div>
        </div>
      </div>

      {/* Footer: Elegant "Created by Jtech Solutions" credit */}
      <div className="w-full max-w-lg pb-4 pt-2 flex flex-col items-center justify-center gap-1.5 relative z-10 border-t border-slate-900/90">
        <div className="inline-flex items-center gap-2 opacity-90 hover:opacity-100 transition-opacity">
          <div className="w-4 h-4 shrink-0 flex items-center justify-center">
            <JtechLogo className="w-full h-full" />
          </div>
          <span className="text-[11px] sm:text-xs text-slate-400 font-medium tracking-wide">
            Created by <span className="font-bold text-slate-200">Jtech Solutions</span>
          </span>
        </div>
        <p className="text-[10px] text-slate-500">
          Official Institutional Academic Portal &copy; {new Date().getFullYear()} MNS-UET Multan
        </p>
      </div>
    </div>
  );
};
