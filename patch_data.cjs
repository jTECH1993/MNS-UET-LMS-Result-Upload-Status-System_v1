const fs = require('fs');
let code = fs.readFileSync('src/data/departmentsData.ts', 'utf8');

code = code.replace(
  /status: '' as const,/,
  `status: 'Pending' as const,`
);

fs.writeFileSync('src/data/departmentsData.ts', code);
