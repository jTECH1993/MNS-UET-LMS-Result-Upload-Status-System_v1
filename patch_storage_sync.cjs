const fs = require('fs');
let code = fs.readFileSync('src/services/storageService.ts', 'utf8');

const replacement = `
  private static _isSyncing = false;
  
  public static initFirebaseSync(): void {
    if (this._isSyncing) return;
    this._isSyncing = true;

    // Listen to Firebase records and update local storage
    FirebaseStore.listenToSubmissions((records) => {
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

    // Generic key sync for Accounts, Logs, Sessions, Requisitions, etc.
    const keysToSync = [
      ACCESS_LOG_KEY,
      AVAILABLE_SESSIONS_KEY,
      CURRENT_SESSION_KEY,
      ACTIVE_SESSIONS_KEY,
      WORK_ON_DEMAND_KEY,
      'mnsuet_user_accounts_v99',
      'mnsuet_session_active_roster_v99__2023',
      'mnsuet_session_active_roster_v99__2024'
    ];

    let isReceiving = false;
    const originalSetItem = localStorage.setItem;
    
    // Intercept localStorage.setItem
    localStorage.setItem = function(key, value) {
      originalSetItem.apply(this, arguments as any);
      
      // If it's a key we want to sync, and we aren't currently receiving it from Firebase
      if (!isReceiving && keysToSync.includes(key)) {
        try {
          FirebaseStore.syncGlobalState(key, JSON.parse(value)).catch(console.error);
        } catch(e) {
          FirebaseStore.syncGlobalState(key, value).catch(console.error);
        }
      }
      
      // Also catch dynamic roster keys
      if (!isReceiving && key.startsWith(SESSION_ROSTER_KEY) && !keysToSync.includes(key)) {
        keysToSync.push(key); // Track it
        FirebaseStore.listenGlobalState(key, (data) => {
          if (data === undefined) return;
          const current = localStorage.getItem(key);
          const newStr = typeof data === 'string' ? data : JSON.stringify(data);
          if (current !== newStr) {
            isReceiving = true;
            localStorage.setItem(key, newStr);
            isReceiving = false;
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('mnsuet_storage_updated'));
            }
          }
        });
        try {
          FirebaseStore.syncGlobalState(key, JSON.parse(value)).catch(console.error);
        } catch(e) {
          FirebaseStore.syncGlobalState(key, value).catch(console.error);
        }
      }
    };

    // Listen to all initial keys
    keysToSync.forEach(key => {
      FirebaseStore.listenGlobalState(key, (data) => {
        if (data === undefined) return;
        const current = localStorage.getItem(key);
        const newStr = typeof data === 'string' ? data : JSON.stringify(data);
        if (current !== newStr) {
          isReceiving = true;
          localStorage.setItem(key, newStr);
          isReceiving = false;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mnsuet_storage_updated'));
            if (key === 'mnsuet_user_accounts_v99') {
              window.dispatchEvent(new CustomEvent('mnsuet_auth_changed'));
            }
          }
        }
      });
    });
    
    // Push the initial default accounts up to Firebase if not present
    setTimeout(() => {
       const accounts = localStorage.getItem('mnsuet_user_accounts_v99');
       if (accounts) {
         // This will trigger the interceptor and push up
         localStorage.setItem('mnsuet_user_accounts_v99', accounts);
       }
    }, 2000);
  }
`;

// Replace the old initFirebaseSync
code = code.replace(
  /private static _isSyncing = false;[\s\S]*?(?=\/\/ 3\. Patch saveSubmission|public static async saveSubmission)/,
  replacement
);

fs.writeFileSync('src/services/storageService.ts', code);
