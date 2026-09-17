const fs = require('fs');
let code = fs.readFileSync('src/services/authService.ts', 'utf8');

const replacement = `  public static getAccounts(): UserAccount[] {
    try {
      const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (!raw) {
        return DEFAULT_ACCOUNTS;
      }
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Error reading accounts, using defaults', e);
      return DEFAULT_ACCOUNTS;
    }
  }`;

// Find the getAccounts block and replace it
code = code.replace(/  public static getAccounts\(\): UserAccount\[\] \{[\s\S]*?return DEFAULT_ACCOUNTS;\n    \}\n  \}/, replacement);

fs.writeFileSync('src/services/authService.ts', code);
