import React, { useState, useEffect } from 'react';
import {
  Activity,
  Database,
  Cloud,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HardDrive,
  ArrowUpRight,
  Info,
  X,
  ShieldCheck,
  Radio,
  FileSpreadsheet,
  Users,
  Sliders,
  FileText,
  Workflow,
  Sparkles,
  TrendingUp,
  Zap,
  BarChart2,
  ShieldAlert,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  FirestoreUsageService,
  FirestoreUsageStats,
  DailyUsageHistoryPoint,
  FIREBASE_CONSOLE_URL,
  FIREBASE_PROJECT_ID,
  FIRESTORE_DATABASE_ID,
  SPARK_LIMITS,
  BLAZE_LIMITS,
  FirebasePlanTier,
} from '../services/firestoreUsageService';
import { FirebaseStore } from '../lib/firebaseStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export const FirestoreUsageModal: React.FC<Props> = ({
  isOpen,
  onClose,
  isAdmin = false,
}) => {
  const [stats, setStats] = useState<FirestoreUsageStats>(() => FirestoreUsageService.getUsageStats());
  const [countdown, setCountdown] = useState(() => FirestoreUsageService.getTimeUntilReset());
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<FirebasePlanTier>(stats.planTier);
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'logs' | 'plan'>('overview');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // 7-day historical usage data for API Usage Health Sparklines
  const sevenDayHistory = React.useMemo(() => {
    return FirestoreUsageService.getSevenDayUsageHistory();
  }, [stats]);

  const sevenDaySummary = React.useMemo(() => {
    let totalReads = 0;
    let totalWrites = 0;
    let spikeCount = 0;
    let peakOps = -1;
    let peakDayLabel = '';
    let peakSpikeReason = '';

    sevenDayHistory.forEach((pt) => {
      totalReads += pt.reads;
      totalWrites += pt.writes;
      if (pt.isSpike) spikeCount++;
      if (pt.totalOps > peakOps) {
        peakOps = pt.totalOps;
        peakDayLabel = pt.dayLabel;
        peakSpikeReason = pt.spikeReason || 'High volume operation burst';
      }
    });

    const totalOps = totalReads + totalWrites;
    const avgDailyOps = Math.round(totalOps / Math.max(1, sevenDayHistory.length));

    return {
      totalReads,
      totalWrites,
      totalOps,
      avgDailyOps,
      spikeCount,
      peakOps,
      peakDayLabel,
      peakSpikeReason,
      hasSpikes: spikeCount > 0,
    };
  }, [sevenDayHistory]);

  // Auto-refresh stats and countdown timer
  useEffect(() => {
    if (!isOpen) return;

    const updateStats = () => {
      setStats(FirestoreUsageService.getUsageStats());
    };

    updateStats();
    const unsub = FirestoreUsageService.subscribe(setStats);

    const timer = setInterval(() => {
      setCountdown(FirestoreUsageService.getTimeUntilReset());
    }, 1000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentLimits = selectedPlan === 'BLAZE' ? BLAZE_LIMITS : SPARK_LIMITS;
  const writesUsed = stats.writes;
  const writesLimit = currentLimits.dailyWrites;
  const writesRemaining = Math.max(0, writesLimit - writesUsed);
  const writesPct = Math.min(100, Math.round((writesUsed / writesLimit) * 100));

  const readsUsed = stats.reads;
  const readsLimit = currentLimits.dailyReads;
  const readsRemaining = Math.max(0, readsLimit - readsUsed);
  const readsPct = Math.min(100, Math.round((readsUsed / readsLimit) * 100));

  const deletesUsed = stats.deletes;
  const deletesLimit = currentLimits.dailyDeletes;
  const deletesRemaining = Math.max(0, deletesLimit - deletesUsed);
  const deletesPct = Math.min(100, Math.round((deletesUsed / deletesLimit) * 100));

  const handleTestConnection = async () => {
    setIsTestingConn(true);
    setTestResult(null);
    try {
      const res = await FirebaseStore.testConnection();
      setTestResult(res);
      setStats(FirestoreUsageService.getUsageStats());
    } catch (e: any) {
      setTestResult({ success: false, message: e?.message || 'Connection test failed.' });
    } finally {
      setIsTestingConn(false);
    }
  };

  const handleResetCounters = () => {
    if (window.confirm('Reset local daily Firestore operation counters for today?')) {
      FirebaseStore.setQuotaExhausted(false);
      FirestoreUsageService.resetDailyCounters();
      setStats(FirestoreUsageService.getUsageStats());
      setActionNotice('Local operation counter reset to 0 for today.');
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  const handlePlanChange = (plan: FirebasePlanTier) => {
    setSelectedPlan(plan);
    if (plan === 'BLAZE') {
      FirebaseStore.setQuotaExhausted(false);
    }
    FirestoreUsageService.setPlanTier(plan);
    setStats(FirestoreUsageService.getUsageStats());
    setActionNotice(`Subscription display updated to ${plan === 'SPARK' ? 'Spark (Free Tier)' : 'Blaze (Pay-As-You-Go)'}.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const getStatusColor = (pct: number, isExhausted: boolean) => {
    if (isExhausted || pct >= 100) return 'text-rose-600 bg-rose-500';
    if (pct >= 85) return 'text-amber-600 bg-amber-500';
    if (pct >= 60) return 'text-yellow-600 bg-yellow-500';
    return 'text-emerald-600 bg-emerald-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-100">Firestore Operations & Quota Monitor</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {selectedPlan === 'SPARK' ? 'Spark Free Tier' : 'Blaze Pay-As-You-Go'}
                </span>
                {stats.isQuotaExhausted && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                    Quota Reached
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                DB: {FIRESTORE_DATABASE_ID.slice(0, 24)}... • Project: {FIREBASE_PROJECT_ID}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={FIREBASE_CONSOLE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
              title="Open Google Firebase Console Usage Dashboard"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Firebase Console</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 px-4 sm:px-6 pt-2">
          <div className="flex gap-2 sm:gap-4 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2.5 px-2 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Quota & Usage Overview
            </button>
            <button
              onClick={() => setActiveTab('breakdown')}
              className={`pb-2.5 px-2 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'breakdown'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Collection Breakdown
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`pb-2.5 px-2 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'logs'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Recent Operations ({stats.operationLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('plan')}
              className={`pb-2.5 px-2 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'plan'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Subscription & Limits
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pb-2">
            <span className="flex items-center gap-1 text-[11px] font-mono">
              <Clock className="w-3 h-3 text-slate-400" />
              Reset in: <strong>{countdown.hours}h {countdown.minutes}m {countdown.seconds}s</strong>
            </span>
          </div>
        </div>

        {/* Action Notice Banner */}
        {actionNotice && (
          <div className="bg-indigo-50 dark:bg-indigo-950/60 border-b border-indigo-200 dark:border-indigo-800 px-4 py-2 text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2 animate-in fade-in">
            <Info className="w-4 h-4 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              
              {/* Top Banner Alert if Quota Exceeded */}
              {stats.isQuotaExhausted ? (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300 shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Firestore Spark Daily Write Limit Exceeded</h4>
                      <p className="text-xs text-rose-700 dark:text-rose-300/90 mt-0.5">
                        All 40,000 free writes for today have been consumed. The system has automatically activated the
                        fail-safe <strong>Local & SQLite Storage Mode</strong>. All faculty result uploads, marks, and changes continue saving securely to the local and server SQLite databases.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <a
                      href={FIREBASE_CONSOLE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                    >
                      <span>Upgrade / View Console</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span>
                      <strong>Cloud Firestore Operational:</strong> Writing and reading within daily Spark quotas. Dual-save to SQLite and Local storage active.
                    </span>
                  </div>
                  <span className="hidden sm:inline text-[11px] font-mono font-medium text-emerald-700 dark:text-emerald-300">
                    UTC Day: {stats.date}
                  </span>
                </div>
              )}

              {/* Main Quota Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. Document Writes Card */}
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700/70 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Document Writes
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      stats.isQuotaExhausted || writesPct >= 100
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                        : writesPct >= 75
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                    }`}>
                      {writesPct}% Used
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {writesUsed.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        / {writesLimit.toLocaleString()} daily
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full transition-all duration-500 ${
                          stats.isQuotaExhausted || writesPct >= 100
                            ? 'bg-rose-500'
                            : writesPct >= 75
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${writesPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700/60">
                    <span>Remaining Left:</span>
                    <strong className={writesRemaining === 0 ? 'text-rose-600 dark:text-rose-400 font-mono' : 'text-slate-800 dark:text-slate-200 font-mono'}>
                      {writesRemaining.toLocaleString()} writes
                    </strong>
                  </div>
                </div>

                {/* 2. Document Reads Card */}
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700/70 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Document Reads
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      readsPct >= 90
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                        : readsPct >= 75
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                    }`}>
                      {readsPct}% Used
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {readsUsed.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        / {readsLimit.toLocaleString()} daily
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-indigo-500 transition-all duration-500"
                        style={{ width: `${readsPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700/60">
                    <span>Remaining Left:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">
                      {readsRemaining.toLocaleString()} reads
                    </strong>
                  </div>
                </div>

                {/* 3. Document Deletes Card */}
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700/70 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Document Deletes
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                      {deletesPct}% Used
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {deletesUsed.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        / {deletesLimit.toLocaleString()} daily
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${deletesPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700/60">
                    <span>Remaining Left:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">
                      {deletesRemaining.toLocaleString()} deletes
                    </strong>
                  </div>
                </div>

              </div>

              {/* API USAGE HEALTH VISUALIZER (7-DAY SPARKLINE CHART & ANOMALY DETECTOR) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                          API Usage Health &amp; 7-Day Activity Sparkline
                        </h4>
                        {sevenDaySummary.hasSpikes ? (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            <span>{sevenDaySummary.spikeCount} Operation Spike(s) Detected</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Optimal Traffic Baseline</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        7-day trend of read and write activity across Firestore collections to assist Administrators in identifying anomalous operation bursts.
                      </p>
                    </div>
                  </div>

                  {/* Micro Legend */}
                  <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 self-start sm:self-center">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block shadow-xs"></span> Reads
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-xs"></span> Writes
                    </span>
                  </div>
                </div>

                {/* Recharts Area Chart Sparkline */}
                <div className="h-52 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={sevenDayHistory}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorReads" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorWrites" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                      <XAxis
                        dataKey="dayLabel"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#475569' }}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#475569' }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                          color: '#f8fafc',
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                        }}
                        formatter={(value: any, name: any) => [
                          `${Number(value).toLocaleString()} ops`,
                          name === 'reads' ? '📖 Reads' : '✍️ Writes',
                        ]}
                        labelFormatter={(label, payload) => {
                          const point = payload && payload[0] ? payload[0].payload : null;
                          if (point && point.isSpike) {
                            return `${label} — 🚨 ANOMALY SPIKE: ${point.spikeReason || 'Operation Burst'}`;
                          }
                          return `${label} Activity`;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="reads"
                        name="reads"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorReads)"
                      />
                      <Area
                        type="monotone"
                        dataKey="writes"
                        name="writes"
                        stroke="#f43f5e"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorWrites)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* 4 Health Metric Micro-Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800">
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
                    <div className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                      7-Day Total Ops
                    </div>
                    <div className="text-sm sm:text-base font-black text-indigo-300 mt-0.5 tabular-nums">
                      {sevenDaySummary.totalOps.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {sevenDaySummary.totalReads.toLocaleString()} R / {sevenDaySummary.totalWrites.toLocaleString()} W
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
                    <div className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                      Avg Daily Activity
                    </div>
                    <div className="text-sm sm:text-base font-black text-emerald-400 mt-0.5 tabular-nums">
                      {sevenDaySummary.avgDailyOps.toLocaleString()} <span className="text-[10px] text-slate-400">ops/day</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Baseline operational pace
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
                    <div className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                      Peak Volume Day
                    </div>
                    <div className="text-sm sm:text-base font-black text-amber-300 mt-0.5 truncate">
                      {sevenDaySummary.peakDayLabel}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                      {sevenDaySummary.peakOps.toLocaleString()} total ops
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
                    <div className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                      Anomaly Detector
                    </div>
                    <div className={`text-sm sm:text-base font-black mt-0.5 ${sevenDaySummary.hasSpikes ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {sevenDaySummary.hasSpikes ? `${sevenDaySummary.spikeCount} Spike(s)` : 'Clear (No Spikes)'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                      {sevenDaySummary.hasSpikes ? sevenDaySummary.peakSpikeReason : 'Within normal variance'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Secondary Specs Bar: Storage, Egress & Daily Reset Countdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Free Stored Data</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      ~1.8 MB <span className="text-[10px] text-slate-500">/ 1 GiB limit</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 shrink-0">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Monthly Network Egress</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      ~45 MB <span className="text-[10px] text-slate-500">/ 10 GiB allowance</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Quota Reset Schedule</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {countdown.hours}h {countdown.minutes}m {countdown.seconds}s <span className="text-[10px] text-slate-500">(00:00 UTC)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct Firebase Console Action Box */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-900/90 to-slate-900 text-white border border-indigo-700/50 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">Official Google Firebase Console Usage</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/30 text-indigo-200">Live 24h Telemetry</span>
                  </div>
                  <p className="text-xs text-indigo-200/80 max-w-xl">
                    View official hourly breakdown, gRPC write streams, latency graphs, and billing settings directly inside your Firebase Cloud Console.
                  </p>
                </div>
                <a
                  href={FIREBASE_CONSOLE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-xs transition-colors shrink-0"
                >
                  <span>Open 24h Usage Report</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Admin Cloud Connection Probe Box */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">Cloud Real-time Connectivity Probe</h5>
                    <p className="text-[11px] text-slate-500">Test if Firebase has reset today's quota limit or enabled the cloud write stream.</p>
                  </div>
                  <button
                    onClick={handleTestConnection}
                    disabled={isTestingConn}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingConn ? 'animate-spin' : ''}`} />
                    <span>{isTestingConn ? 'Testing Cloud...' : 'Test Connection'}</span>
                  </button>
                </div>

                {testResult && (
                  <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                  }`}>
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />}
                    <span>{testResult.message || (testResult.success ? 'Successfully verified live connection to Cloud Firestore.' : 'Connection test failed.')}</span>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* BREAKDOWN TAB */}
          {activeTab === 'breakdown' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Firestore Collection Operations Breakdown</h4>
                  <p className="text-xs text-slate-500">Document writes, reads, and deletes performed by collection today</p>
                </div>
                <button
                  onClick={handleResetCounters}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset Counter
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-4">Collection</th>
                      <th className="py-2.5 px-4">Purpose</th>
                      <th className="py-2.5 px-4 text-right">Writes Today</th>
                      <th className="py-2.5 px-4 text-right">Reads Today</th>
                      <th className="py-2.5 px-4 text-right">Deletes Today</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                        records
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">Department LMS Submissions & Grade Marks</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {(stats.writesByCollection.records || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {(stats.readsByCollection.records || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {(stats.deletesByCollection.records || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Active
                        </span>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        users
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">Faculty & Admin Accounts Authentication</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {(stats.writesByCollection.users || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {(stats.readsByCollection.users || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {(stats.deletesByCollection.users || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Active
                        </span>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-slate-400" />
                        config
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">Institutional Deadlines & System Parameters</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {(stats.writesByCollection.config || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {(stats.readsByCollection.config || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {(stats.deletesByCollection.config || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Active
                        </span>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        logs
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        Audit & Access Records <span className="text-[10px] text-indigo-600 font-bold">(Local/SQLite conserved)</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {(stats.writesByCollection.logs || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {(stats.readsByCollection.logs || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {(stats.deletesByCollection.logs || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                          Conserving Quota
                        </span>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                        <Workflow className="w-4 h-4 text-slate-400" />
                        requisitions
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">Work-On-Demand Automation Requests</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {(stats.writesByCollection.requisitions || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {(stats.readsByCollection.requisitions || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {(stats.deletesByCollection.requisitions || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Active
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LOGS TAB */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Recent Operations Telemetry Log</h4>
                  <p className="text-xs text-slate-500">Real-time audit log of Firestore write, read, and delete operations</p>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  Total logged: {stats.operationLogs.length}
                </span>
              </div>

              {stats.operationLogs.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
                  <Activity className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No database operations logged yet for today.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                  {stats.operationLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          log.type === 'WRITE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : log.type === 'READ'
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {log.type}
                        </span>
                        <div>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            /{log.collection}
                          </span>
                          {log.details && (
                            <span className="text-slate-500 dark:text-slate-400 ml-2">
                              • {log.details}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-slate-400 font-mono text-[11px]">
                        <span>+{log.count} op</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SUBSCRIPTION & PLAN TAB */}
          {activeTab === 'plan' && (
            <div className="space-y-5">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Firebase Project Subscription & Capacity</h4>
                <p className="text-xs text-slate-500">Current tier limits and instructions for scaling beyond free quotas</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Spark Plan Option */}
                <div
                  onClick={() => handlePlanChange('SPARK')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedPlan === 'SPARK'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-sm text-slate-900 dark:text-white">Spark Plan (Free Tier)</span>
                    {selectedPlan === 'SPARK' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">Active</span>
                    ) : (
                      <span className="text-xs text-slate-400">Click to Select</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                    Default free tier without requiring a billing account. Shared quota group allows up to 40k writes daily.
                  </p>
                  <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 font-medium">
                    <li className="flex items-center gap-2">✓ <strong>40,000</strong> Write Units / day</li>
                    <li className="flex items-center gap-2">✓ <strong>50,000</strong> Read Units / day</li>
                    <li className="flex items-center gap-2">✓ <strong>50,000</strong> Real-Time Update Units / day</li>
                    <li className="flex items-center gap-2">✓ <strong>1 GiB</strong> Total Stored Data</li>
                    <li className="flex items-center gap-2">✓ <strong>10 GiB</strong> Network Egress / month</li>
                  </ul>
                </div>

                {/* Blaze Plan Option */}
                <div
                  onClick={() => handlePlanChange('BLAZE')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedPlan === 'BLAZE'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-sm text-slate-900 dark:text-white">Blaze Plan (Pay-As-You-Go)</span>
                    {selectedPlan === 'BLAZE' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">Active</span>
                    ) : (
                      <span className="text-xs text-slate-400">Click to Select</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                    Pay-as-you-go scaling. Includes all free Spark quotas each day, then bills standard rates for overages.
                  </p>
                  <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 font-medium">
                    <li className="flex items-center gap-2">✓ <strong>Unlimited</strong> Writes ($0.18 per 100k extra)</li>
                    <li className="flex items-center gap-2">✓ <strong>Unlimited</strong> Reads ($0.06 per 100k extra)</li>
                    <li className="flex items-center gap-2">✓ <strong>Automatic Scaling</strong> (No quota halts)</li>
                    <li className="flex items-center gap-2">✓ <strong>Budgets & Alerts</strong> Support</li>
                  </ul>
                </div>
              </div>

              {/* Upgrade Instructions Box */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <h5 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  How to Upgrade Project to Blaze Plan
                </h5>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400">
                  <li>Open the official Firebase Console: <a href="https://console.firebase.google.com/project/hrcv-2d7ce/usage" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 underline font-mono">console.firebase.google.com/project/hrcv-2d7ce</a></li>
                  <li>Click <strong>Upgrade</strong> at the bottom left menu.</li>
                  <li>Select the <strong>Blaze Plan</strong> and link a Google Cloud Billing account.</li>
                  <li>You keep the free 40,000 writes and 50,000 reads every day; billing only occurs if daily activity exceeds that volume.</li>
                </ol>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span>Local & SQLite Fail-Safe:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Always Protected</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
