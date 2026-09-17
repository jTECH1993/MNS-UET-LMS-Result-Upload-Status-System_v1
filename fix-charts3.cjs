const fs = require('fs');
let content = fs.readFileSync('src/components/VCAnalyticsCharts.tsx', 'utf-8');

// The AreaChart uses `globalPercentage`. We can define it right before the AreaChart or globally.
// Let's find where to insert `const globalPercentage = ...`
const insertStr = `
  const globalPercentage = useMemo(() => {
    const total = deptPerformanceData.reduce((acc, curr) => acc + curr.Total, 0);
    const uploaded = deptPerformanceData.reduce((acc, curr) => acc + curr.Uploaded, 0);
    return total > 0 ? Math.round((uploaded / total) * 100) : 0;
  }, [deptPerformanceData]);
`;

// Insert it right after `const deptPerformanceData = useMemo(() => { ... });`
content = content.replace(/(\n  \}, \[allRecords, effectiveSessions, selectedSemesterFilter, selectedShiftFilter, selectedSectionFilter\]\);\n)/, "$1" + insertStr);

fs.writeFileSync('src/components/VCAnalyticsCharts.tsx', content);
