const fs = require('fs');
let code = fs.readFileSync('src/services/storageService.ts', 'utf8');

code = code.replace(
  /try \{\n\s*try \{\n\s*const res = await fetch\(`\/api\/submissions\/\$\{key\}`[\s\S]*?catch \(apiError\) \{\n\s*console\.warn\('Server delete fetch failed[\s\S]*?\}\n\s*/,
  "try {\n      "
);

fs.writeFileSync('src/services/storageService.ts', code);
