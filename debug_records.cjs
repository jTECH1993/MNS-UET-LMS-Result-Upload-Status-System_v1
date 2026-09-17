const fs = require('fs');

// We will inject a debug console log into App.tsx to see what is loaded
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('DEBUG ALLRECORDS:')) {
  code = code.replace(
    "setAllRecords(list);",
    "setAllRecords(list);\n    console.log('DEBUG ALLRECORDS:', list);"
  );
  fs.writeFileSync('src/App.tsx', code);
}
