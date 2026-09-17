const fs = require('fs');
let code = fs.readFileSync('src/components/VCAnalyticsCharts.tsx', 'utf8');

// Add LineChart and Line to recharts import
code = code.replace(
  /import \{\s*BarChart,\s*Bar,\s*XAxis,\s*YAxis,\s*CartesianGrid,\s*Tooltip,\s*Legend,\s*ResponsiveContainer,\s*PieChart,\s*Pie,\s*Cell\s*\} from 'recharts';/,
  `import {
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
} from 'recharts';`
);

// We need to inject the trendData useMemo hook right before `// Derived datasets for the charts`
const trendHook = `  const trendData = useMemo(() => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    
    const map = new Map();
    dates.forEach(d => map.set(d, 0));
    
    allRecords.forEach(r => {
      if (!effectiveSessions.includes(r.session || '2023')) return;
      if (selectedShiftFilter !== 'ALL' && (r.shift || 'Morning') !== selectedShiftFilter) return;
      if (selectedSemesterFilter !== 'ALL' && (r.semester || '1') !== selectedSemesterFilter) return;
      if (selectedSectionFilter !== 'ALL' && (r.section || 'A').trim().toUpperCase() !== selectedSectionFilter.trim().toUpperCase()) return;

      if (r.subjects) {
        r.subjects.forEach(subj => {
          if (subj.status === 'Uploaded' && subj.dateUploaded) {
            if (map.has(subj.dateUploaded)) {
              map.set(subj.dateUploaded, map.get(subj.dateUploaded) + 1);
            }
          }
        });
      }
    });

    return dates.map(dateStr => {
      const dateObj = new Date(dateStr);
      return {
        dateFull: dateStr,
        dateDisplay: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        Uploads: map.get(dateStr) || 0
      };
    });
  }, [allRecords, effectiveSessions, selectedShiftFilter, selectedSemesterFilter, selectedSectionFilter]);

`;

code = code.replace(/\/\/ Derived datasets for the charts/, trendHook + '  // Derived datasets for the charts');

// Now we need to insert the Line Chart into the UI.
// There is `<div className="space-y-6">`
// Let's find `        {/* Row 2: Submitted vs Pending Programs */}`
// and we'll insert a new Row 2 for the Trend chart, and shift that to Row 3.

const newTrendRow = `
        {/* Trend Row: 7-Day Upload Trend */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Result Uploads (Last 7 Days)
            </h3>
          </div>
          <div className="h-[250px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="dateDisplay" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '12px', border: 'none' }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Line type="monotone" dataKey="Uploads" name="Courses Uploaded" stroke={COLORS.uploaded} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, stroke: COLORS.uploaded, strokeWidth: 2, fill: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
`;

code = code.replace(
  /\{\/\* Row 2: Submitted vs Pending Programs \*\/\}/,
  newTrendRow + '\n        {/* Row 3: Submitted vs Pending Programs */}'
);

fs.writeFileSync('src/components/VCAnalyticsCharts.tsx', code);
