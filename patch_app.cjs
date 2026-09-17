const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('StorageService.initFirebaseSync()')) {
  code = code.replace(
    "StorageService.apiSyncSubmissions().then(() => {",
    "StorageService.initFirebaseSync();\n    StorageService.apiSyncSubmissions().then(() => {"
  );
  fs.writeFileSync('src/App.tsx', code);
}
