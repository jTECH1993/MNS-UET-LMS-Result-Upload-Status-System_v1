const fs = require('fs');
let code = fs.readFileSync('src/components/VCAnalyticsCharts.tsx', 'utf8');

code = code.replace(
  /import \{\s*BarChart,\s*Bar,\s*XAxis,\s*YAxis,\s*CartesianGrid,\s*Tooltip,\s*Legend,\s*ResponsiveContainer,\s*\} from 'recharts';/,
  `import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';`
);

code = code.replace(
  /const COLORS = \{\n\s*uploaded: '#059669', \/\/ Emerald 600\n\s*pending: '#dc2626', \/\/ Red 600\n\s*inProgress: '#2563eb', \/\/ Blue 600\n\};/,
  `const COLORS = {
  uploaded: '#059669', // Emerald 600
  pending: '#dc2626', // Red 600
  inProgress: '#2563eb', // Blue 600
};
const PIE_COLORS = ['#059669', '#2563eb', '#dc2626'];`
);

// We need to add the new charts to the return statement.
// The existing charts are in a `<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">`
// Let's replace the whole grid section.

const newChartsHTML = `
      {/* Comprehensive Charts Section */}
      <div className="space-y-6">
        
        {/* Row 1: Overall Status Pie & Top Departments Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart 1: Overall Status Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4 lg:col-span-1">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Overall LMS Status Breakdown
              </h3>
            </div>
            <div className="h-[280px] w-full pt-2 flex flex-col items-center justify-center relative">
              {aggregateKPIs.totalSubjects === 0 ? (
                 <div className="text-xs text-slate-400">No data available</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Uploaded', value: aggregateKPIs.totalUploaded },
                          { name: 'In Progress', value: aggregateKPIs.inProgress },
                          { name: 'Pending', value: aggregateKPIs.totalPending }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill={COLORS.uploaded} />
                        <Cell fill={COLORS.inProgress} />
                        <Cell fill={COLORS.pending} />
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '12px', border: 'none' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-[42%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none flex flex-col items-center">
                    <span className="text-2xl font-black text-slate-800 dark:text-white">{aggregateKPIs.totalSubjects}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Chart 2: Department Compliance Rates */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Departmental Compliance Rate (Upload %)
              </h3>
            </div>
            <div className="h-[280px] w-full pt-2">
              {deptPerformanceData.length === 0 ? (
                 <div className="h-full flex items-center justify-center text-xs text-slate-400">No department data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={deptPerformanceData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => \`\${val}%\`} domain={[0, 100]} />
                    <Tooltip
                      cursor={{ fill: 'rgba(226, 232, 240, 0.4)' }}
                      contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '12px', border: 'none' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="Percentage" name="Upload Compliance %" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30}>
                      {
                        deptPerformanceData.map((entry, index) => (
                          <Cell key={\`cell-\${index}\`} fill={entry.Percentage === 100 ? COLORS.uploaded : entry.Percentage === 0 ? COLORS.pending : '#6366f1'} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Submitted vs Pending Programs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 3: Course Sheets: Submitted Results */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Course Sheets: Submitted Results
                </h3>
              </div>
            </div>
            <div className="h-[350px] w-full pt-2">
              {submittedProgramsChartData.length === 0 ? (
                 <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No programs have submitted results yet.
                 </div>
              ) : (
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart
                     data={submittedProgramsChartData}
                     layout="vertical"
                     margin={{ top: 0, right: 20, left: 20, bottom: 0 }}
                   >
                     <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.6} />
                     <XAxis type="number" hide />
                     <YAxis type="category" dataKey="displayName" width={220} tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} axisLine={false} tickLine={false} />
                     <Tooltip
                       contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '12px', border: 'none' }}
                       itemStyle={{ color: '#fff' }}
                     />
                     <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                     <Bar dataKey="Uploaded" name="Courses Uploaded" stackId="a" fill={COLORS.uploaded} radius={[0, 4, 4, 0]} barSize={20} />
                     <Bar dataKey="In Progress" name="Partially Uploaded" stackId="a" fill={COLORS.inProgress} radius={[0, 4, 4, 0]} barSize={20} />
                   </BarChart>
                 </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 4: Course Sheets: Pending / Missing Results */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Course Sheets: Pending / Delayed Results
                </h3>
              </div>
            </div>
            <div className="h-[350px] w-full pt-2">
              {pendingProgramsChartData.length === 0 ? (
                 <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> All programs have uploaded successfully!</span>
                 </div>
              ) : (
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart
                     data={pendingProgramsChartData}
                     layout="vertical"
                     margin={{ top: 0, right: 20, left: 20, bottom: 0 }}
                   >
                     <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.6} />
                     <XAxis type="number" hide />
                     <YAxis type="category" dataKey="displayName" width={220} tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} axisLine={false} tickLine={false} />
                     <Tooltip
                       contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '12px', border: 'none' }}
                       itemStyle={{ color: '#fff' }}
                     />
                     <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                     <Bar dataKey="Pending" name="Courses Delayed" stackId="a" fill={COLORS.pending} radius={[0, 4, 4, 0]} barSize={20} />
                   </BarChart>
                 </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
`;

code = code.replace(
  /\{\/\* Clear Charts based on user request: Submitted vs Pending Programs \*\/\}([\s\S]*?)<\/div>\s*<\/div>\s*\);\s*\};\s*$/m,
  newChartsHTML + `\n    </div>\n  );\n};\n`
);

fs.writeFileSync('src/components/VCAnalyticsCharts.tsx', code);
