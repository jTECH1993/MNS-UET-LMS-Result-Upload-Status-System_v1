const fs = require('fs');
let code = fs.readFileSync('src/components/HODEntryForm.tsx', 'utf8');

code = code.replace(
  /<span>Vice Chancellor Academic Oversight • Read-Only Inspection Mode<\/span>/,
  `<span>
    {isDeadlineExpired && !isVC && !isAdmin 
      ? 'Deadline Expired • Form is Locked (Contact VC to Edit)'
      : 'Vice Chancellor Academic Oversight • Read-Only Inspection Mode'}
  </span>`
);

fs.writeFileSync('src/components/HODEntryForm.tsx', code);
