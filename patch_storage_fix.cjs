const fs = require('fs');
let code = fs.readFileSync('src/services/storageService.ts', 'utf8');

// Fix the dynamic keys loop (it doesn't need DEFAULT_ACCOUNTS since it's only for roster)
code = code.replace(
  /if \(!isReceiving && key\.startsWith\(SESSION_ROSTER_KEY\) && !keysToSync\.includes\(key\)\) \{\n\s*keysToSync\.push\(key\); \/\/ Track it\n\s*FirebaseStore\.listenGlobalState\(key, \(data\) => \{\n\s*if \(data === undefined\) \{\n\s*if \(key === 'mnsuet_user_accounts_v99'\) \{\n\s*import\('\.\/authService'\)\.then\(\(\{ DEFAULT_ACCOUNTS \}\) => \{\n\s*if \(!localStorage\.getItem\('mnsuet_user_accounts_v99'\)\) \{\n\s*localStorage\.setItem\('mnsuet_user_accounts_v99', JSON\.stringify\(DEFAULT_ACCOUNTS\)\);\n\s*\}\n\s*\}\);\n\s*\}\n\s*return;\n\s*\}/,
  `if (!isReceiving && key.startsWith(SESSION_ROSTER_KEY) && !keysToSync.includes(key)) {
        keysToSync.push(key); // Track it
        FirebaseStore.listenGlobalState(key, (data) => {
          if (data === undefined) return;`
);

// Fix the initial keysToSync loop
code = code.replace(
  /keysToSync\.forEach\(key => \{\n\s*FirebaseStore\.listenGlobalState\(key, \(data\) => \{\n\s*if \(data === undefined\) return;\n\s*const current = localStorage\.getItem\(key\);/,
  `keysToSync.forEach(key => {
      FirebaseStore.listenGlobalState(key, (data) => {
        if (data === undefined) {
          if (key === 'mnsuet_user_accounts_v99') {
             import('./authService').then(({ DEFAULT_ACCOUNTS }) => {
               if (!localStorage.getItem('mnsuet_user_accounts_v99')) {
                 localStorage.setItem('mnsuet_user_accounts_v99', JSON.stringify(DEFAULT_ACCOUNTS));
               }
             });
          }
          return;
        }
        const current = localStorage.getItem(key);`
);

fs.writeFileSync('src/services/storageService.ts', code);
