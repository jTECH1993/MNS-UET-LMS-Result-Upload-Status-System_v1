const fs = require('fs');
let code = fs.readFileSync('src/services/storageService.ts', 'utf8');

// Replace the setTimeout block
code = code.replace(
  /\/\/ Push the initial default accounts up to Firebase if not present\n\s*setTimeout\(\(\) => \{\n\s*const accounts = localStorage\.getItem\('mnsuet_user_accounts_v99'\);\n\s*if \(accounts\) \{\n\s*\/\/ This will trigger the interceptor and push up\n\s*localStorage\.setItem\('mnsuet_user_accounts_v99', accounts\);\n\s*\}\n\s*\}, 2000\);/,
  `// Push the initial default accounts up to Firebase if not present
    setTimeout(() => {
       const accounts = localStorage.getItem('mnsuet_user_accounts_v99');
       if (accounts) {
         // Push what we have up to ensure sync (only if we have something)
         localStorage.setItem('mnsuet_user_accounts_v99', accounts);
       } else {
         // First run ever: seed default accounts to localStorage (which will push to Firebase)
         import('./authService').then(({ AuthService, DEFAULT_ACCOUNTS }) => {
            if (!localStorage.getItem('mnsuet_user_accounts_v99')) {
                localStorage.setItem('mnsuet_user_accounts_v99', JSON.stringify(DEFAULT_ACCOUNTS));
            }
         });
       }
    }, 2000);`
);

fs.writeFileSync('src/services/storageService.ts', code);
