import React, { useMemo } from 'react';
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
  Cell
} from 'recharts';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Building2,
  Layers,
  Clock,
  ChevronRight
} from 'lucide-react';
import { SubmissionRecord, AcademicShift } from '../types';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import { StorageService } from '../services/storageService';
import { DepartmentDimension, ProgramDimension, SectionBreakdown, VCAnalyticsService } from '../services/vcAnalyticsService';

interface VCAnalyticsChartsProps {
  allRecords: SubmissionRecord[];
  currentSession: string;
  activeSessions: string[];
  selectedSemesterFilter: string;
  selectedShiftFilter: 'ALL' | AcademicShift;
  selectedSectionFilter: string;
  onFilterByDepartment?: (deptName: string) => void;
  onFilterByStatus?: (status: 'ALL' | 'SUBMITTED' | 'PENDING') => void;
  onSelectDepartment?: (dept: DepartmentDimension) => void;
  onSelectProgram?: (prog: ProgramDimension) => void;
}

const COLORS = {
  uploaded: '#059669', // Emerald 600
  pending: '#dc2626', // Red 600
  inProgress: '#2563eb', // Blue 600
};

export const VCAnalyticsCharts: React.FC<VCAnalyticsChartsProps> = ({
  allRecords,
  currentSession,
  activeSessions,
  selectedSemesterFilter,
  selectedShiftFilter,
  selectedSectionFilter,
  onFilterByDepartment,
  onFilterByStatus,
  onSelectDepartment,
  onSelectProgram,
}) => {
  const hierarchy = useMemo(() => {
    return VCAnalyticsService.buildAcademicHierarchy({
      allRecords,
      currentSession,
      semesterFilter: selectedSemesterFilter,
      shiftFilter: selectedShiftFilter,
      sectionFilter: selectedSectionFilter,
    });
  }, [allRecords, currentSession, selectedSemesterFilter, selectedShiftFilter, selectedSectionFilter]);

  // Program-Level dataset for Grouped Bar Chart (Item 26-C: Completion by Program)
  const programGroupedData = useMemo(() => {
    const list: any[] = [];
    hierarchy.departments.forEach((dept) => {
      dept.programs.slice(0, 3).forEach((prog) => {
        list.push({
          name: `${dept.code} - ${prog.program.replace(/^(BS|B\.Sc\.)\s*/, '')}`,
          fullName: prog.program,
          department: dept.name,
          Uploaded: prog.uploadedCourses,
          Pending: prog.pendingCourses,
          Percentage: prog.completionRate,
          fullProgram: prog,
        });
      });
    });
    return list.slice(0, 10);
  }, [hierarchy]);

  // Department comparison dataset (Item 26-B)
  const departmentChartData = useMemo(() => {
    return hierarchy.departments.map((dept) => ({
      name: dept.code,
      fullName: dept.name,
      Percentage: dept.completionRate,
      Uploaded: dept.uploadedCourses,
      Pending: dept.pendingCourses,
      Total: dept.totalCourses,
      fullDept: dept,
    }));
  }, [hierarchy]);

  // Submission Trend dataset (Item 26-D: Mon, Tue, Wed, Thu, Fri...)
  const trendData = useMemo(() => {
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const map = new Map<string, number>();
    dates.forEach((d) => map.set(d, 0));

    allRecords.forEach((r) => {
      if (r.session !== currentSession) return;
      if (r.subjects) {
        r.subjects.forEach((subj) => {
          if (subj.status === 'Uploaded' && subj.dateUploaded) {
            if (map.has(subj.dateUploaded)) {
              map.set(subj.dateUploaded, (map.get(subj.dateUploaded) || 0) + 1);
            }
          }
        });
      }
    });

    let cumulative = 0;
    return dates.map((dateStr) => {
      const dayCount = map.get(dateStr) || 0;
      cumulative += dayCount;
      const dateObj = new Date(dateStr);
      return {
        dateFull: dateStr,
        dateDisplay: dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        Uploads: dayCount,
        Cumulative: cumulative,
      };
    });
  }, [allRecords, currentSession]);

  // Status Distribution dataset (Item 26-E: Donut Chart)
  const statusPieData = useMemo(() => {
    return [
      { name: 'Completed / Uploaded', value: hierarchy.uploadedCourses, color: '#059669' },
      { name: 'In Progress / Partial', value: Math.max(0, hierarchy.totalCourses - hierarchy.uploadedCourses - hierarchy.pendingCourses), color: '#2563eb' },
      { name: 'Pending Attention', value: hierarchy.pendingCourses, color: '#dc2626' },
    ].filter((item) => item.value > 0);
  }, [hierarchy]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Row 1: Overall Status Distribution (Donut) & Program Completion (Grouped Bar) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Donut */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4 lg:col-span-1">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Status Distribution
            </h3>
          </div>
          <div className="h-[280px] w-full pt-2 flex flex-col items-center justify-center relative">
            {hierarchy.totalCourses === 0 ? (
              <div className="text-xs text-slate-400">No course data logged yet</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusPieData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        color: '#fff',
                        borderRadius: '8px',
                        fontSize: '12px',
                        border: 'none',
                      }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-[42%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none flex flex-col items-center">
                  <span className="text-2xl font-black text-slate-800 dark:text-white">
                    {hierarchy.overallCompletionRate}%
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    Overall
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Completion by Program (Grouped Bar Chart) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Completion by Program (Grouped Analysis)
              </h3>
            </div>
            <span className="text-xs text-slate-400">Top degree programs across departments</span>
          </div>

          <div className="h-[280px] w-full pt-2">
            {programGroupedData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No active program data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={programGroupedData} margin={{ top: 10, right: 20, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '12px',
                      border: 'none',
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Uploaded" name="Uploaded Courses" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Pending" name="Pending Courses" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Submission Trend Over Time */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Submission Progression Trend (Last 7 Days)
            </h3>
          </div>
          <span className="text-xs text-slate-400">Activity velocity across faculty uploads</span>
        </div>

        <div className="h-[240px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
              <XAxis dataKey="dateDisplay" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  color: '#fff',
                  borderRadius: '8px',
                  fontSize: '12px',
                  border: 'none',
                }}
                itemStyle={{ color: '#fff' }}
                cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line
                type="monotone"
                dataKey="Uploads"
                name="Daily Uploads"
                stroke="#059669"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6, stroke: '#059669', strokeWidth: 2, fill: '#fff' }}
              />
              <Line
                type="monotone"
                dataKey="Cumulative"
                name="Cumulative Total"
                stroke="#4f46e5"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
