const fs = require('fs');
let code = fs.readFileSync('src/components/HODEntryForm.tsx', 'utf8');

// replace createInitialBlankRows(8 to createInitialBlankRows(1
code = code.replace(/createInitialBlankRows\(8,/g, 'createInitialBlankRows(1,');

// replace padding
code = code.replace(/while \(rows\.length < 8\)/g, 'while (rows.length < 1)');
code = code.replace(/while \(filledRows\.length < total\)/g, 'while (filledRows.length < 1)');
code = code.replace(/const total = Math\.max\(newRows\.length, 6\);/g, 'const total = Math.max(newRows.length, 1);');
code = code.replace(/while \(finalRows\.length < 8\)/g, 'while (finalRows.length < 1)');
code = code.replace(/while \(copiedRows\.length < 8\)/g, 'while (copiedRows.length < 1)');

code = code.replace(
  /<option value="Uploaded">\u2713 Uploaded \(Complete\)<\/option>/,
  '<option value="" disabled>-- Select Status --</option>\n                            <option value="Uploaded">\u2713 Uploaded (Complete)</option>'
);

fs.writeFileSync('src/components/HODEntryForm.tsx', code);
