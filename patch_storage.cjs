const fs = require('fs');
let code = fs.readFileSync('src/services/storageService.ts', 'utf8');

// 1. Add import
if (!code.includes('FirebaseStore')) {
  code = code.replace(
    "from '../data/departmentsData';",
    "from '../data/departmentsData';\nimport { FirebaseStore } from '../lib/firebaseStore';"
  );
}

// 2. Add initSync method
const initSyncCode = `
  private static _isSyncing = false;
  
  public static initFirebaseSync(): void {
    if (this._isSyncing) return;
    this._isSyncing = true;
    
    // Listen to Firebase records and update local storage
    FirebaseStore.listenToSubmissions((records) => {
      // Avoid firing events if data hasn't changed to prevent loops
      const current = localStorage.getItem(STORAGE_KEY);
      const newStr = JSON.stringify(records);
      if (current !== newStr) {
        localStorage.setItem(STORAGE_KEY, newStr);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mnsuet_storage_updated'));
        }
      }
    });

    // Listen to System Config (deadline)
    FirebaseStore.listenToSystemConfig((config) => {
      const current = localStorage.getItem(SYSTEM_DEADLINE_KEY);
      if (config?.deadline !== undefined && config.deadline !== current) {
        if (config.deadline === null) {
          localStorage.removeItem(SYSTEM_DEADLINE_KEY);
        } else {
          localStorage.setItem(SYSTEM_DEADLINE_KEY, config.deadline);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mnsuet_deadline_updated', { detail: config.deadline }));
        }
      }
    });
  }
`;
if (!code.includes('initFirebaseSync')) {
  code = code.replace('export class StorageService {', 'export class StorageService {' + initSyncCode);
}

// 3. Patch saveSubmission
code = code.replace(
  "// Update local store to reflect changes instantly (optional but good for sync)",
  "// Update local store to reflect changes instantly (optional but good for sync)\n      FirebaseStore.saveSubmission(record).catch(e => console.error('Firebase save failed', e));"
);

// 4. Patch deleteSubmission
code = code.replace(
  "this.logAccess(`Permanently deleted submission record for: ${program} (${section})`);",
  "this.logAccess(`Permanently deleted submission record for: ${program} (${section})`);\n      FirebaseStore.deleteSubmission(key).catch(e => console.error('Firebase delete failed', e));"
);

// 5. Patch setSystemDeadline
code = code.replace(
  "if (typeof window !== 'undefined') {\n      window.dispatchEvent(new CustomEvent('mnsuet_deadline_updated', { detail: isoString }));\n    }",
  "FirebaseStore.setSystemDeadline(isoString).catch(e => console.error('Firebase deadline save failed', e));\n    if (typeof window !== 'undefined') {\n      window.dispatchEvent(new CustomEvent('mnsuet_deadline_updated', { detail: isoString }));\n    }"
);

fs.writeFileSync('src/services/storageService.ts', code);
