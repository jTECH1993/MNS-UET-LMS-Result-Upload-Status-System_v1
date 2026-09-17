const fs = require('fs');
let code = fs.readFileSync('src/services/storageService.ts', 'utf8');

// Replace the listenGlobalState callback in the initial keys loop
code = code.replace(
  /FirebaseStore\.listenGlobalState\(key, \(data\) => \{\n\s*if \(data === undefined\) return;\n\s*const current = localStorage\.getItem\(key\);/,
  `FirebaseStore.listenGlobalState(key, (data) => {
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

// Remove the setTimeout block entirely as it is now handled by the onSnapshot failure
code = code.replace(
  /\/\/ Push the initial default accounts up to Firebase if not present\n\s*setTimeout\(\(\) => \{[\s\S]*?\}, 2000\);/,
  `// Initial push handled via onSnapshot undefined state.`
);

fs.writeFileSync('src/services/storageService.ts', code);
