const fs = require('fs');
let content = fs.readFileSync('src/components/VCAnalyticsCharts.tsx', 'utf-8');

// The original globalPercentage was declared at the top of the component as:
// const globalPercentage = Math.round((overallUploaded / Math.max(1, overallUploaded + overallPending + overallInProgress)) * 100) || 0;
// Wait, actually I don't see overallUploaded anywhere.

// Let's find how overallPercentage is calculated in VCAnalyticsCharts
// Or I can calculate it directly
content = content.replace(/\(Math\.round\(\(overallUploaded \/ Math\.max\(1, overallUploaded \+ overallPending \+ overallInProgress\)\) \* 100\) \|\| 0\)/g, "globalPercentage");

fs.writeFileSync('src/components/VCAnalyticsCharts.tsx', content);
