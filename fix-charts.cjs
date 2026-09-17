const fs = require('fs');
let content = fs.readFileSync('src/components/VCAnalyticsCharts.tsx', 'utf-8');

content = content.replace(/curr\.totalSubjects \|\| 0/g, 'curr.subjects.length || 0');
content = content.replace(/curr\.notApplicableSubjects \|\| 0/g, "(curr.subjects.filter(s => s.status === 'Not Applicable').length) || 0");
content = content.replace(/curr\.uploadedSubjects \|\| 0/g, "(curr.subjects.filter(s => s.status === 'Uploaded').length) || 0");
content = content.replace(/globalPercentage/g, '(Math.round((overallUploaded / Math.max(1, overallUploaded + overallPending + overallInProgress)) * 100) || 0)');
content = content.replace(/formatter={\(value: number\) =>/g, "formatter={(value: any) =>");

fs.writeFileSync('src/components/VCAnalyticsCharts.tsx', content);
