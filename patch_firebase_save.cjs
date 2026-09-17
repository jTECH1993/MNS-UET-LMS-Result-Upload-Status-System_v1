const fs = require('fs');
let code = fs.readFileSync('src/services/storageService.ts', 'utf8');

code = code.replace(
  "FirebaseStore.saveSubmission(completeRecord).catch(e => console.error('Firebase save failed', e));",
  "const firebaseReadyRecord = JSON.parse(JSON.stringify(completeRecord));\n      FirebaseStore.saveSubmission(firebaseReadyRecord).catch(e => console.error('Firebase save failed', e));"
);

fs.writeFileSync('src/services/storageService.ts', code);
