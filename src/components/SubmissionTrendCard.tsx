import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { StorageService } from '../services/storageService';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import {
  TrendingUp,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  Activity,
} from 'lucide-react';

interface Props {
  selectedDepartment?: string;
  onSelectDepartment?: (dept: string) => void;
}

export const SubmissionTrendCard: React.FC<Props> = ({
  selectedDepartment = '',
  onSelectDepartment,
}) => {
  const [activeDepartment, setActiveDepartment] = useState<string>(selectedDepartment);
  const [chartMode, setChartMode] = useState<'7day' | 'deptBreakdown'>('7day');

  // Compute 7-day trend data
  const trendData = useMemo(() => {
    const allRecords = StorageService.getAllSubmissions();
    const days: { dateStr: string; label: string; uploads: number; coursesUploaded: number }[] = [];

    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      let uploads = 0;
      let coursesUploaded = 0;

      allRecords.forEach((r) => {
        if (!r || !r.department) return;
        if (activeDepartment && !StorageService._isDeptMatch(activeDepartment, r.department)) {
          return;
        }

        const matchDate =
          (r.updatedAt && r.updatedAt.startsWith(dateStr)) ||
          (r.submissionDate && r.submissionDate.startsWith(dateStr));

        if (matchDate) {
          uploads++;
          const valid = (r.subjects || []).filter((s) => s.status === 'Uploaded').length;
          coursesUploaded += valid;
        }
      });

      days.push({
        dateStr,
        label,
        uploads,
        coursesUploaded,
      });
    }

    return days;
  }, [activeDepartment]);

  // Compute department breakdown for bottleneck identification
  const deptBreakdownData = useMemo(() => {
    const allRecords = StorageService.getAllSubmissions();

    return UNIVERSITY_DEPARTMENTS.map((dept) => {
      let uploaded = 0;
      let pending = 0;

      const deptRecords = allRecords.filter(
        (r) => r && r.department && StorageService._isDeptMatch(dept.name, r.department)
      );

      deptRecords.forEach((r) => {
        r.subjects.forEach((s) => {
          if (s.status === 'Uploaded') uploaded++;
          else pending++;
        });
      });

      // Account for expected courses in unsubmitted cohorts
      const totalPrograms = dept.programs.length;
      const expectedTotal = totalPrograms * 2 * 8 * 5; // 2 shifts * 8 sems * 5 courses = 80 per prog
      if (uploaded + pending < expectedTotal) {
        pending += expectedTotal - (uploaded + pending);
      }

      return {
        name: dept.code,
        fullName: dept.name,
        Uploaded: uploaded,
        Pending: pending,
        CompletionPct: Math.round((uploaded / (uploaded + pending || 1)) * 100),
      };
    });
  }, []);

  // Identify real-time critical bottleneck department
  const bottleneckDept = useMemo(() => {
    const sorted = [...deptBreakdownData].sort((a, b) => b.Pending - a.Pending);
    return sorted[0] || null;
  }, [deptBreakdownData]);

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-5 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Real-Time Recharts Analytics
              </span>
              <span className="text-xs text-slate-400">• VC Executive Oversight</span>
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5">
              7-Day Submission Progress & Bottleneck Trend
            </h3>
          </div>
        </div>

        {/* View Switcher & Department Filter */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
            <button
              onClick={() => setChartMode('7day')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                chartMode === '7day'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              7-Day Velocity
            </button>
            <button
              onClick={() => setChartMode('deptBreakdown')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                chartMode === 'deptBreakdown'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dept Bottlenecks
            </button>
          </div>

          <select
            value={activeDepartment}
            onChange={(e) => {
              setActiveDepartment(e.target.value);
              if (onSelectDepartment) onSelectDepartment(e.target.value);
            }}
            className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">All Departments</option>
            {UNIVERSITY_DEPARTMENTS.map((d) => (
              <option key={d.code} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Real-Time Bottleneck Insight Banner */}
      {bottleneckDept && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-300">
                Critical Bottleneck Auto-Identified: {bottleneckDept.fullName}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 font-mono text-[10px]">
                {bottleneckDept.Pending} Pending Courses
              </span>
            </div>
            <p className="text-slate-300 mt-0.5 leading-relaxed">
              Overall completion rate is currently at <strong>{bottleneckDept.CompletionPct}%</strong>.
              Coordinators need priority follow-up for result verification in LMS.
            </p>
          </div>
        </div>
      )}

      {/* Recharts Render Area */}
      <div className="h-72 w-full pt-2">
        {chartMode === '7day' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorCourses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="coursesUploaded"
                name="Uploaded Subjects"
                stroke="#0ea5e9"
                fillOpacity={1}
                fill="url(#colorCourses)"
              />
              <Area
                type="monotone"
                dataKey="uploads"
                name="Result Sheets Submitted"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorUploads)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={deptBreakdownData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="Uploaded" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Auto-Synchronized with
          Firestore Cloud Database
        </span>
        <span className="font-mono text-slate-500">Live 7-Day Velocity Tracking</span>
      </div>
    </div>
  );
};
