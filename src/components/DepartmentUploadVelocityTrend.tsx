import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Activity,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import { StorageService } from '../services/storageService';
import { SubmissionRecord, AcademicShift } from '../types';

interface Props {
  allRecords: SubmissionRecord[];
  currentSession: string;
  activeSessions?: string[];
  selectedSemesterFilter?: string;
  selectedShiftFilter?: 'ALL' | AcademicShift;
  selectedSectionFilter?: string;
  onSelectDepartment?: (deptName: string) => void;
}

// Distinct high-contrast colors mapped to departments
const DEPARTMENT_COLORS: Record<string, string> = {
  'Civil Engineering': '#10b981', // Emerald
  'Computer Science': '#6366f1', // Indigo
  'Electrical Engineering': '#f59e0b', // Amber
  'Mechanical Engineering': '#f43f5e', // Rose
  'Agricultural Engineering': '#06b6d4', // Cyan / Sky
  'Basic Sciences & Humanities': '#a855f7', // Purple
  'Architectural Engineering': '#14b8a6', // Teal
  'Chemical Engineering': '#ec4899', // Pink
  'Environmental Engineering': '#84cc16', // Lime
  'Industrial Engineering': '#eab308', // Yellow
};

const FALLBACK_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export const DepartmentUploadVelocityTrend: React.FC<Props> = ({
  allRecords,
  currentSession,
  activeSessions = [],
  selectedSemesterFilter = 'ALL',
  selectedShiftFilter = 'ALL',
  selectedSectionFilter = 'ALL',
  onSelectDepartment,
}) => {
  const [timeWindow, setTimeWindow] = useState<'7' | '14' | '30' | 'SESSION'>('14');
  const [velocityMetric, setVelocityMetric] = useState<'DAILY' | 'CUMULATIVE' | 'RATE'>('DAILY');

  // Multi-department filter selection state (defaults to top active departments selected)
  const [selectedDepts, setSelectedDepts] = useState<string[]>(() => {
    return UNIVERSITY_DEPARTMENTS.slice(0, 5).map((d) => d.name);
  });

  // Normalize active session list
  const effectiveSessions = useMemo(() => {
    if (activeSessions && activeSessions.length > 0) return activeSessions;
    if (currentSession) return [currentSession];
    return ['2023'];
  }, [activeSessions, currentSession]);

  // Compute departmental velocity time-series points
  const velocityData = useMemo(() => {
    const today = new Date();
    const daysCount = timeWindow === '7' ? 7 : timeWindow === '14' ? 14 : timeWindow === '30' ? 30 : 60;

    const dates: { dateStr: string; displayLabel: string; fullDateLabel: string }[] = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const displayLabel = d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
      const fullDateLabel = d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
      dates.push({ dateStr, displayLabel, fullDateLabel });
    }

    // Filter relevant records for effective session and global filters
    const matchingRecords = allRecords.filter((r) => {
      if (!r || !r.department) return false;

      // Session match
      const rSess = (r.session || '2023').trim();
      const sessMatch = effectiveSessions.some(
        (s) => rSess.startsWith(s) || s.startsWith(rSess) || rSess.includes(s) || s.includes(rSess)
      );
      if (!sessMatch) return false;

      // Shift filter match
      if (selectedShiftFilter !== 'ALL') {
        const rShift = (r.shift || 'Morning').trim().toLowerCase();
        if (rShift !== selectedShiftFilter.trim().toLowerCase()) return false;
      }

      // Semester filter match
      if (selectedSemesterFilter !== 'ALL') {
        const semList = selectedSemesterFilter.split(',');
        const rSem = String(r.semester || '1').replace(/\D/g, '') || '1';
        if (!semList.includes(rSem)) return false;
      }

      // Section filter match
      if (selectedSectionFilter !== 'ALL') {
        const rSec = (r.section || 'A').trim().toUpperCase();
        if (rSec !== selectedSectionFilter.trim().toUpperCase()) return false;
      }

      return true;
    });

    // Map departmental uploaded course counts by YYYY-MM-DD
    const deptDailyMap: Record<string, Record<string, number>> = {};
    const deptTotalsInWindow: Record<string, number> = {};

    UNIVERSITY_DEPARTMENTS.forEach((dept) => {
      deptDailyMap[dept.name] = {};
      deptTotalsInWindow[dept.name] = 0;
      dates.forEach((dt) => {
        deptDailyMap[dept.name][dt.dateStr] = 0;
      });
    });

    // Populate actual uploads from DB records
    matchingRecords.forEach((rec) => {
      const deptName = UNIVERSITY_DEPARTMENTS.find((d) => StorageService._isDeptMatch(d.name, rec.department))?.name || rec.department;

      if (!deptDailyMap[deptName]) {
        deptDailyMap[deptName] = {};
        dates.forEach((dt) => {
          deptDailyMap[deptName][dt.dateStr] = 0;
        });
      }

      (rec.subjects || []).forEach((sub) => {
        if (!sub || sub.status !== 'Uploaded') return;

        // Extract upload date
        const rawDate = sub.dateUploaded || (sub as any).timestamp || rec.updatedAt || rec.submissionDate || rec.createdAt;
        let dateStr = '';
        if (rawDate) {
          if (rawDate.includes('T')) dateStr = rawDate.split('T')[0];
          else if (rawDate.match(/^\d{4}-\d{2}-\d{2}/)) dateStr = rawDate.slice(0, 10);
        }

        if (!dateStr || !deptDailyMap[deptName][dateStr]) {
          // Fallback to today if date not explicitly mapped
          dateStr = dates[dates.length - 1].dateStr;
        }

        if (deptDailyMap[deptName][dateStr] !== undefined) {
          deptDailyMap[deptName][dateStr] += 1;
          deptTotalsInWindow[deptName] = (deptTotalsInWindow[deptName] || 0) + 1;
        }
      });
    });

    // Compute cumulative or daily data points for Recharts LineChart
    const deptCumulativeRunning: Record<string, number> = {};
    UNIVERSITY_DEPARTMENTS.forEach((d) => {
      deptCumulativeRunning[d.name] = 0;
    });

    const chartPoints = dates.map((dt) => {
      const point: Record<string, any> = {
        dateStr: dt.dateStr,
        dateDisplay: dt.displayLabel,
        dateFull: dt.fullDateLabel,
        totalWindowUploads: 0,
      };

      let sumDayUploads = 0;

      UNIVERSITY_DEPARTMENTS.forEach((dept) => {
        const dailyCount = deptDailyMap[dept.name]?.[dt.dateStr] || 0;
        deptCumulativeRunning[dept.name] += dailyCount;
        sumDayUploads += dailyCount;

        if (velocityMetric === 'DAILY') {
          point[dept.name] = dailyCount;
        } else if (velocityMetric === 'CUMULATIVE') {
          point[dept.name] = deptCumulativeRunning[dept.name];
        } else {
          // Completion rate velocity trajectory (%)
          // Assume 40 total courses expected per department
          const pct = Math.min(100, Math.round((deptCumulativeRunning[dept.name] / 40) * 100));
          point[dept.name] = pct;
        }
      });

      point.totalWindowUploads = sumDayUploads;

      return point;
    });

    // Compute Department Leaderboard Metrics
    const deptMetricsList = UNIVERSITY_DEPARTMENTS.map((dept, idx) => {
      const totalInWindow = deptTotalsInWindow[dept.name] || 0;
      const dailyAvg = (totalInWindow / daysCount).toFixed(1);

      // Compute last 3 days vs previous 3 days acceleration
      const recent3Days = dates.slice(-3).reduce((sum, d) => sum + (deptDailyMap[dept.name]?.[d.dateStr] || 0), 0);
      const prev3Days = dates.slice(-6, -3).reduce((sum, d) => sum + (deptDailyMap[dept.name]?.[d.dateStr] || 0), 0);

      const momentum =
        recent3Days > prev3Days ? 'ACCELERATING' : recent3Days < prev3Days ? 'DECELERATING' : 'STEADY';

      return {
        deptName: dept.name,
        deptCode: dept.code,
        totalInWindow,
        dailyAvg,
        recent3Days,
        momentum,
        color: DEPARTMENT_COLORS[dept.name] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
      };
    }).sort((a, b) => b.totalInWindow - a.totalInWindow);

    // Identify top velocity department
    const velocityLeader = deptMetricsList[0];
    const fastestAccelerating = [...deptMetricsList].sort((a, b) => b.recent3Days - a.recent3Days)[0];

    const totalUploadedInWindow = Object.values(deptTotalsInWindow).reduce((a, b) => a + b, 0);
    const overallDailyRate = (totalUploadedInWindow / daysCount).toFixed(1);

    return {
      chartPoints,
      deptMetricsList,
      velocityLeader,
      fastestAccelerating,
      totalUploadedInWindow,
      overallDailyRate,
      daysCount,
    };
  }, [
    allRecords,
    effectiveSessions,
    selectedShiftFilter,
    selectedSemesterFilter,
    selectedSectionFilter,
    timeWindow,
    velocityMetric,
  ]);

  const toggleDept = (deptName: string) => {
    setSelectedDepts((prev) => {
      if (prev.includes(deptName)) {
        if (prev.length === 1) return prev; // Prevent unselecting all
        return prev.filter((d) => d !== deptName);
      }
      return [...prev, deptName];
    });
  };

  const handleSelectTop4 = () => {
    const top4 = velocityData.deptMetricsList.slice(0, 4).map((d) => d.deptName);
    setSelectedDepts(top4);
  };

  const handleSelectAll = () => {
    setSelectedDepts(UNIVERSITY_DEPARTMENTS.map((d) => d.name));
  };

  return (
    <div
      id="dept-upload-velocity-trend"
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md p-5 sm:p-6 space-y-5"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-900/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Result Upload Velocity Trend
              </h3>
              <span className="bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                Academic Session {effectiveSessions.join(', ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comparative result upload rates and submission momentum across university departments
            </p>
          </div>
        </div>

        {/* Top Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Velocity Metric Selector */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold">
            <button
              type="button"
              onClick={() => setVelocityMetric('DAILY')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                velocityMetric === 'DAILY'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Daily Velocity
            </button>
            <button
              type="button"
              onClick={() => setVelocityMetric('CUMULATIVE')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                velocityMetric === 'CUMULATIVE'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Cumulative Total
            </button>
            <button
              type="button"
              onClick={() => setVelocityMetric('RATE')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                velocityMetric === 'RATE'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Compliance Rate %
            </button>
          </div>

          {/* Time Window Selector */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold">
            {[
              { id: '7', label: '7 Days' },
              { id: '14', label: '14 Days' },
              { id: '30', label: '30 Days' },
              { id: 'SESSION', label: 'Full Session' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTimeWindow(opt.id as any)}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  timeWindow === opt.id
                    ? 'bg-emerald-600 text-white shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Velocity Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
              Velocity Leader
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
              {velocityData.velocityLeader?.deptName || 'All Departments'}
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
              {velocityData.velocityLeader?.totalInWindow || 0} course uploads ({velocityData.velocityLeader?.dailyAvg || 0}/day)
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
              Fastest Acceleration
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
              {velocityData.fastestAccelerating?.deptName || 'Computer Science'}
            </span>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
              +{velocityData.fastestAccelerating?.recent3Days || 0} uploads in last 3 days
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
              Session Overall Velocity
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
              {velocityData.overallDailyRate} Courses / Day
            </span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
              {velocityData.totalUploadedInWindow} Total uploads in {velocityData.daysCount} days
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Department Selector Toggle Pills */}
      <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-500" />
            <span>Compare Departments on Trend Chart ({selectedDepts.length} Selected):</span>
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleSelectTop4}
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700"
            >
              Top 4 Highest
            </button>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700"
            >
              Select All
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {UNIVERSITY_DEPARTMENTS.map((dept, idx) => {
            const isSelected = selectedDepts.includes(dept.name);
            const deptColor = DEPARTMENT_COLORS[dept.name] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];

            return (
              <button
                key={dept.name}
                type="button"
                onClick={() => toggleDept(dept.name)}
                style={{
                  borderColor: isSelected ? deptColor : undefined,
                  backgroundColor: isSelected ? `${deptColor}15` : undefined,
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? 'text-slate-900 dark:text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-700'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: deptColor }}
                />
                <span>{dept.code || dept.name}</span>
                {isSelected && <span className="text-[10px] font-black opacity-80">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Recharts Line Chart */}
      <div className="h-[320px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={velocityData.chartPoints}
            margin={{ top: 15, right: 25, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
            <XAxis
              dataKey="dateDisplay"
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
              tickMargin={6}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                color: '#fff',
                borderRadius: '10px',
                fontSize: '12px',
                border: '1px solid #334155',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
              }}
              itemStyle={{ color: '#fff', fontSize: '11px', padding: '1px 0' }}
              cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
              labelFormatter={(label, items) => {
                if (items && items[0] && items[0].payload) {
                  return `📅 ${items[0].payload.dateFull}`;
                }
                return label;
              }}
              formatter={(value: any, name: any) => {
                const unit =
                  velocityMetric === 'DAILY'
                    ? 'courses uploaded'
                    : velocityMetric === 'CUMULATIVE'
                    ? 'cumulative courses'
                    : '% complete';
                return [`${value} ${unit}`, name];
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 600 }}
              iconType="circle"
            />

            {UNIVERSITY_DEPARTMENTS.map((dept, idx) => {
              if (!selectedDepts.includes(dept.name)) return null;

              const color = DEPARTMENT_COLORS[dept.name] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];

              return (
                <Line
                  key={dept.name}
                  type="monotone"
                  dataKey={dept.name}
                  name={dept.code || dept.name}
                  stroke={color}
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 1.5, fill: '#fff', stroke: color }}
                  activeDot={{ r: 6, stroke: color, strokeWidth: 2, fill: '#fff' }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Department Leaderboard Grid */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2.5">
          Departmental Upload Velocity Leaderboard ({timeWindow === 'SESSION' ? 'Session Total' : `Last ${timeWindow} Days`})
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {velocityData.deptMetricsList.map((item) => (
            <button
              key={`card-${item.deptName}`}
              type="button"
              onClick={() => onSelectDepartment?.(item.deptName)}
              className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-left hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {item.deptCode}
                </span>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              </div>
              <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                {item.totalInWindow} Courses
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                <span>{item.dailyAvg} / day</span>
                <span
                  className={`font-bold ${
                    item.momentum === 'ACCELERATING'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : item.momentum === 'DECELERATING'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-500'
                  }`}
                >
                  {item.momentum === 'ACCELERATING' ? '↗ High' : item.momentum === 'DECELERATING' ? '↘ Low' : '→ Steady'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
