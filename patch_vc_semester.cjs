const fs = require('fs');
let code = fs.readFileSync('src/components/VCDashboard.tsx', 'utf8');

code = code.replace(
  "const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<string>('1');",
  "const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<string>('ALL');"
);

fs.writeFileSync('src/components/VCDashboard.tsx', code);
