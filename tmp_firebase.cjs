const fs = require('fs');
const content = fs.readFileSync('src/lib/firebase.ts', 'utf8');
fs.writeFileSync('src/lib/firebase.ts', '/// <reference types="vite/client" />\n' + content);
