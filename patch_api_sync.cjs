const fs = require('fs');
let code = fs.readFileSync('src/services/storageService.ts', 'utf8');

code = code.replace(
  /public static async apiSyncSubmissions\(\): Promise<void> \{[\s\S]*?\}\n  \}/,
  `public static async apiSyncSubmissions(): Promise<void> {\n    // Replaced by initFirebaseSync real-time listeners\n    return Promise.resolve();\n  }`
);

fs.writeFileSync('src/services/storageService.ts', code);
