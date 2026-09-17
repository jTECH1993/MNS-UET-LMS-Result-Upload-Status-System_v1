const fs = require('fs');
let code = fs.readFileSync('src/services/storageService.ts', 'utf8');

const replacement = `
  public static setSystemDeadline(isoString: string | null): void {
    if (isoString) {
      localStorage.setItem('mnsuet_system_deadline_v99', isoString);
      try { FirebaseStore.setSystemDeadline(isoString); } catch(e) {}
    } else {
      localStorage.removeItem('mnsuet_system_deadline_v99');
      try { FirebaseStore.setSystemDeadline(null); } catch(e) {}
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mnsuet_deadline_updated', { detail: isoString }));
    }
  }
`;

code = code.replace(
  /public static setSystemDeadline[\s\S]*?\}\n  \}/,
  replacement
);

fs.writeFileSync('src/services/storageService.ts', code);
