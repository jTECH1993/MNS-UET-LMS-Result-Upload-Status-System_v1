const fs = require('fs');
let code = fs.readFileSync('src/services/storageService.ts', 'utf8');

code = code.replace(
  "if (key === 'mnsuet_user_accounts_v99') {\n              window.dispatchEvent(new CustomEvent('mnsuet_auth_changed'));\n            }",
  "if (key === 'mnsuet_user_accounts_v99') {\n              window.dispatchEvent(new CustomEvent('mnsuet_auth_changed'));\n            }\n            if (key === ACTIVE_SESSIONS_KEY || key === CURRENT_SESSION_KEY) {\n              window.dispatchEvent(new CustomEvent('mnsuet_sessions_updated'));\n            }\n            if (key.startsWith(SESSION_ROSTER_KEY)) {\n              window.dispatchEvent(new CustomEvent('mnsuet_roster_updated'));\n            }"
);

fs.writeFileSync('src/services/storageService.ts', code);
