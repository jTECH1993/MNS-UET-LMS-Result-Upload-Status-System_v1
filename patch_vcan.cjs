const fs = require('fs');
let code = fs.readFileSync('src/components/VCAnalyticsCharts.tsx', 'utf8');

code = code.replace(
/      const percentage = deptProgs\.length > 0 \n\s*\? Math\.round\(deptProgs\.reduce\(\(acc, curr\) => acc \+ curr\.Percentage, 0\) \/ deptProgs\.length\)\n\s*: 0;/,
`      const percentage = total > 0 ? Math.round((uploaded / total) * 100) : 0;`
);

fs.writeFileSync('src/components/VCAnalyticsCharts.tsx', code);
