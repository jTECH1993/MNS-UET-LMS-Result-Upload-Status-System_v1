const fs = require('fs');
let code = fs.readFileSync('src/components/VCAnalyticsCharts.tsx', 'utf8');

// Update Departmental Compliance
code = code.replace(
  /const percentage = total > 0 \? Math\.round\(\(uploaded \/ total\) \* 100\) : 0;/g,
  `// Calculate percentage by averaging the completion rate of ALL active programs in this department
      const percentage = deptProgs.length > 0 
        ? Math.round(deptProgs.reduce((acc, curr) => acc + curr.Percentage, 0) / deptProgs.length)
        : 0;`
);

// We need to make sure this replacement only affects the deptPerformanceData, but the regex might hit aggregateKPIs too if it was identically formatted.
// Wait, aggregateKPIs also has: `const pct = total > 0 ? Math.round((uploaded / total) * 100) : 0;`

// Let's just do a string replace on the aggregateKPIs manually.
code = code.replace(
  /const pct = total > 0 \? Math\.round\(\(uploaded \/ total\) \* 100\) : 0;/,
  `const totalActivePrograms = programLevelData.length;
    const pct = totalActivePrograms > 0 
      ? Math.round(programLevelData.reduce((acc, curr) => acc + curr.Percentage, 0) / totalActivePrograms)
      : 0;`
);

fs.writeFileSync('src/components/VCAnalyticsCharts.tsx', code);
