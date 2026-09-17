const fs = require('fs');
let code = fs.readFileSync('src/services/authService.ts', 'utf8');

const target = `  // Set explicit theme with persistence & user profile sync
  public static setTheme(newTheme: AppTheme | 'light' | 'dark', userId?: string): AppTheme {
    const normalized = this.applyTheme(newTheme);
    const accounts = this.getAccounts();
    const session = this.getCurrentSession();
    const targetId = userId || session?.id;
    if (targetId) {
      const user = accounts.find((a) => a.id === targetId);
      if (user) {
        user.themePreference = normalized;
        this.saveAccounts(accounts);
      }
      if (session && session.id === targetId) {
        session.themePreference = normalized;
        this.setCurrentSession(session);
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('mnsuet_theme_changed', { detail: { theme: normalized } })
      );
    }
    return normalized;
  }`;

const replacement = `  // Set explicit theme with persistence & user profile sync
  public static setTheme(newTheme: AppTheme | 'light' | 'dark', userId?: string): AppTheme {
    const normalized = this.applyTheme(newTheme);
    const accounts = this.getAccounts();
    const session = this.getCurrentSession();
    const targetId = userId || session?.id;

    if (normalized !== 'midnight') {
      const storageKey = \`mnsuet_prev_light_theme_\${targetId || 'guest'}\`;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(storageKey, normalized);
      }
    }

    if (targetId) {
      const user = accounts.find((a) => a.id === targetId);
      if (user) {
        user.themePreference = normalized;
        this.saveAccounts(accounts);
      }
      if (session && session.id === targetId) {
        session.themePreference = normalized;
        this.setCurrentSession(session);
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('mnsuet_theme_changed', { detail: { theme: normalized } })
      );
    }
    return normalized;
  }`;

code = code.replace(target, replacement);
fs.writeFileSync('src/services/authService.ts', code);
console.log("Done3");
