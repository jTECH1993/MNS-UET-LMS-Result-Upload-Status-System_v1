import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  BarChart3,
  CheckCircle2,
  TrendingUp,
  Clock,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { SubmissionRecord, AcademicShift } from '../types';
import { DepartmentDimension, ProgramDimension, VCAnalyticsService } from '../services/vcAnalyticsService';

interface VCAnalyticsChartsProps {
  allRecords: SubmissionRecord[];
  currentSession: string;
  activeSessions?: string[];
  selectedSemesterFilter: string;
  selectedShiftFilter: 'ALL' | AcademicShift;
  selectedSectionFilter: string;
  onFilterByDepartment?: (deptName: string) => void;
  onFilterByStatus?: (status: 'ALL' | 'SUBMITTED' | 'PENDING') => void;
  onSelectDepartment?: (dept: DepartmentDimension) => void;
  onSelectProgram?: (prog: ProgramDimension) => void;
}

// Helper to robustly extract a YYYY-MM-DD date key from strings or timestamps
function parseToDateKey(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '—' || trimmed === '-') return null;

  // Direct YYYY-MM-DD match
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY match
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Fallback: parse as standard Date object
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    try {
      return parsed.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }

  return null;
}

// Format long degree names for clean, un-crowded X-axis labels
function formatProgramLabel(progName: string, deptCode: string): string {
  let cleaned = progName.replace(/^(BS|B\.Sc\.|B\.Tech|Master of|MS)\s*/i, '').trim();
  cleaned = cleaned
    .replace(/Engineering Technology/gi, 'Eng. Tech')
    .replace(/Engineering/gi, 'Eng.')
    .replace(/Computer Science/gi, 'CS')
    .replace(/Information Technology/gi, 'IT')
    .replace(/Mechanical/gi, 'Mech.')
    .replace(/Electrical/gi, 'Elect.')
    .replace(/Civil/gi, 'Civil')
    .replace(/Architectural/gi, 'Arch.')
    .replace(/Technology/gi, 'Tech');

  const full = `${deptCode} - ${cleaned}`;
  if (full.length > 22) {
    return full.slice(0, 21) + '…';
  }
  return full;
}

export const VCAnalyticsCharts: React.FC<VCAnalyticsChartsProps> = ({
  allRecords,
  currentSession,
  activeSessions = [],
  selectedSemesterFilter,
  selectedShiftFilter,
  selectedSectionFilter,
  onSelectDepartment,
  onSelectProgram,
}) => {
  const [trendDays, setTrendDays] = useState<number>(7);

  // Normalize effective academic sessions
  const effectiveSessions = useMemo(() => {
    if (activeSessions && activeSessions.length > 0) return activeSessions;
    if (currentSession) return [currentSession];
    return [];
  }, [activeSessions, currentSession]);

  const hierarchy = useMemo(() => {
    return VCAnalyticsService.buildAcademicHierarchy({
      allRecords,
      currentSession: effectiveSessions.length > 0 ? effectiveSessions : currentSession,
      semesterFilter: selectedSemesterFilter,
      shiftFilter: selectedShiftFilter,
      sectionFilter: selectedSectionFilter,
    });
  }, [allRecords, effectiveSessions, currentSession, selectedSemesterFilter, selectedShiftFilter, selectedSectionFilter]);

  // Program-Level dataset for Grouped Bar Chart
  const programGroupedData = useMemo(() => {
    const list: any[] = [];
    hierarchy.departments.forEach((dept) => {
      dept.programs.forEach((prog) => {
        if (prog.totalCourses > 0) {
          list.push({
            name: formatProgramLabel(prog.program, dept.code),
            rawName: `${dept.code} - ${prog.program}`,
            fullName: prog.program,
            department: dept.name,
            deptCode: dept.code,
            Uploaded: prog.uploadedCourses,
            Pending: prog.pendingCourses,
            Total: prog.totalCourses,
            Percentage: prog.completionRate,
            fullProgram: prog,
          });
        }
      });
    });

    // If no programs have courses recorded yet, show first cohort programs as fallback
    if (list.length === 0) {
      hierarchy.departments.forEach((dept) => {
        dept.programs.slice(0, 2).forEach((prog) => {
          list.push({
            name: formatProgramLabel(prog.program, dept.code),
            rawName: `${dept.code} - ${prog.program}`,
            fullName: prog.program,
            department: dept.name,
            deptCode: dept.code,
            Uploaded: 0,
            Pending: prog.totalCourses || 0,
            Total: prog.totalCourses || 0,
            Percentage: 0,
            fullProgram: prog,
          });
        });
      });
    }

    // Sort by uploaded courses descending first, then by total courses
    list.sort((a, b) => b.Uploaded - a.Uploaded || b.Total - a.Total);
    return list.slice(0, 10);
  }, [hierarchy]);

  // Submission Progression Trend dataset
  const trendInfo = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Generate consecutive dates array for chosen window
    const dates: string[] = [];
    for (let i = trendDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    const startDateStr = dates[0];
    const endDateStr = dates[dates.length - 1];

    const dailyMap = new Map<string, number>();
    dates.forEach((d) => dailyMap.set(d, 0));

    let priorUploads = 0;
    let windowUploadsCount = 0;
    let totalAllUploads = 0;

    const sessionSet = new Set(effectiveSessions);

    allRecords.forEach((r) => {
      if (!r) return;
      // Session filter check
      if (sessionSet.size > 0 && !sessionSet.has('ALL')) {
        const rSess = (r.session || '2023').trim();
        const matchesSession = Array.from(sessionSet).some(
          (s) => rSess.startsWith(s) || s.startsWith(rSess) || rSess.includes(s) || s.includes(rSess)
        );
        if (!matchesSession) return;
      }
      // Shift filter check
      if (selectedShiftFilter && selectedShiftFilter !== 'ALL') {
        const rShift = (r.shift || 'Morning').trim().toLowerCase();
        if (rShift !== selectedShiftFilter.trim().toLowerCase()) return;
      }
      // Section filter check
      if (selectedSectionFilter && selectedSectionFilter !== 'ALL') {
        const rSec = (r.section || 'A').trim().toUpperCase();
        if (rSec !== selectedSectionFilter.trim().toUpperCase()) return;
      }

      if (r.subjects && Array.isArray(r.subjects)) {
        r.subjects.forEach((subj) => {
          if (subj.status === 'Uploaded') {
            totalAllUploads += 1;

            // Robust fallback resolution for upload timestamp
            const resolvedDate =
              parseToDateKey(subj.dateUploaded) ||
              parseToDateKey(r.submissionDate) ||
              parseToDateKey(r.updatedAt) ||
              parseToDateKey(r.createdAt) ||
              todayStr;

            if (resolvedDate < startDateStr) {
              priorUploads += 1;
            } else if (resolvedDate > endDateStr) {
              const lastKey = dates[dates.length - 1];
              dailyMap.set(lastKey, (dailyMap.get(lastKey) || 0) + 1);
              windowUploadsCount += 1;
            } else if (dailyMap.has(resolvedDate)) {
              dailyMap.set(resolvedDate, (dailyMap.get(resolvedDate) || 0) + 1);
              windowUploadsCount += 1;
            } else {
              // Map to today / last key
              const lastKey = dates[dates.length - 1];
              dailyMap.set(lastKey, (dailyMap.get(lastKey) || 0) + 1);
              windowUploadsCount += 1;
            }
          }
        });
      }
    });

    let runningCumulative = priorUploads;
    const points = dates.map((dateStr) => {
      const dailyCount = dailyMap.get(dateStr) || 0;
      runningCumulative += dailyCount;
      const dateObj = new Date(dateStr + 'T12:00:00');
      return {
        dateFull: dateStr,
        dateDisplay: dateObj.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'numeric',
          day: 'numeric',
        }),
        Uploads: dailyCount,
        Cumulative: runningCumulative,
      };
    });

    return {
      points,
      totalAllUploads,
      windowUploadsCount,
      priorUploads,
      currentCumulative: runningCumulative,
    };
  }, [allRecords, effectiveSessions, selectedShiftFilter, selectedSectionFilter, trendDays]);

  // Status Distribution dataset (Donut Chart)
  const statusPieData = useMemo(() => {
    return [
      { name: 'Completed / Uploaded', value: hierarchy.uploadedCourses, color: '#059669' },
      {
        name: 'In Progress / Partial',
        value: Math.max(0, hierarchy.totalCourses - hierarchy.uploadedCourses - hierarchy.pendingCourses),
        color: '#2563eb',
      },
      { name: 'Pending Attention', value: hierarchy.pendingCourses, color: '#dc2626' },
    ].filter((item) => item.value > 0);
  }, [hierarchy]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Row 1: Overall Status Distribution (Donut) & Program Completion (Grouped Bar) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Donut */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4 lg:col-span-1 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Status Distribution
              </h3>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {hierarchy.totalCourses} Total Courses
            </span>
          </div>

          <div className="h-[320px] w-full pt-2 flex flex-col items-center justify-center relative">
            {hierarchy.totalCourses === 0 ? (
              <div className="text-xs text-slate-400">No course data logged yet</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusPieData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        color: '#fff',
                        borderRadius: '8px',
                        fontSize: '12px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: any, name: any) => [`${value} Courses`, name]}
                    />
                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ fontSize: '11px', paddingTop: '16px' }}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-[38%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none flex flex-col items-center">
                  <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tight font-mono">
                    {hierarchy.submittedUploadedPct}%
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                    Uploaded
                  </span>
                  <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold">
                    ({hierarchy.submittedPendingPct}% Pending)
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Completion by Program (Grouped Bar Chart) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4 lg:col-span-2 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Completion by Program (Grouped Analysis)
                </h3>
                <p className="text-xs text-slate-400">Top degree programs across departments</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                {hierarchy.uploadedCourses} Uploaded
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-semibold border border-rose-200 dark:border-rose-800">
                <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                {hierarchy.pendingCourses} Pending
              </span>
            </div>
          </div>

          <div className="h-[320px] w-full pt-1">
            {programGroupedData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No active program data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={programGroupedData}
                  margin={{ top: 15, right: 20, left: -15, bottom: 65 }}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={65}
                    tickMargin={8}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '12px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(val: any, name: any) => [`${val} Courses`, name]}
                    labelFormatter={(label, items) => {
                      if (items && items[0] && items[0].payload) {
                        const p = items[0].payload;
                        return `${p.fullName} (${p.deptCode}) • ${p.Percentage}% Done`;
                      }
                      return label;
                    }}
                  />
                  {/* Placed at top-right so it NEVER overlaps with X-axis rotated labels */}
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '16px', fontSize: '11px', fontWeight: 600 }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="Uploaded"
                    name="Uploaded Courses"
                    fill="#059669"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="Pending"
                    name="Pending Courses"
                    fill="#dc2626"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Submission Trend Over Time */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Submission Progression Trend
              </h3>
              <p className="text-xs text-slate-400">
                Activity velocity across faculty uploads ({trendInfo.totalAllUploads} total verified courses)
              </p>
            </div>
          </div>

          {/* Timeframe selector tabs */}
          <div className="flex items-center gap-2">
            <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
              {[
                { label: 'Last 7 Days', days: 7 },
                { label: 'Last 14 Days', days: 14 },
                { label: 'Last 30 Days', days: 30 },
              ].map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setTrendDays(opt.days)}
                  className={`px-3 py-1 rounded-md transition-all ${
                    trendDays === opt.days
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold border border-indigo-200 dark:border-indigo-800">
              <span>Window:</span>
              <span className="font-bold">{trendInfo.windowUploadsCount} Uploads</span>
            </div>
          </div>
        </div>

        <div className="h-[270px] w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendInfo.points}
              margin={{ top: 15, right: 25, left: -15, bottom: 5 }}
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
                  borderRadius: '8px',
                  fontSize: '12px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                itemStyle={{ color: '#fff' }}
                cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                formatter={(value: any, name: any) => [`${value} Courses`, name]}
                labelFormatter={(label, items) => {
                  if (items && items[0] && items[0].payload) {
                    return `${items[0].payload.dateFull} (${label})`;
                  }
                  return label;
                }}
              />
              {/* Placed at top-right so it NEVER overlaps with X-axis date labels */}
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '16px', fontSize: '11px', fontWeight: 600 }}
                iconType="circle"
              />
              <Line
                type="monotone"
                dataKey="Uploads"
                name="Daily Uploads"
                stroke="#059669"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#059669' }}
                activeDot={{ r: 6, stroke: '#059669', strokeWidth: 2, fill: '#fff' }}
              />
              <Line
                type="monotone"
                dataKey="Cumulative"
                name="Cumulative Total"
                stroke="#4f46e5"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                dot={{ r: 3, strokeWidth: 1.5, fill: '#fff', stroke: '#4f46e5' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
