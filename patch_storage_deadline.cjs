const fs = require('fs');
let code = fs.readFileSync('src/services/storageService.ts', 'utf8');

const replacement = `
  public static getSystemDeadline(): string | null {
    return localStorage.getItem(SYSTEM_DEADLINE_KEY);
  }

  public static isSystemDeadlineExpired(): boolean {
    const stored = this.getSystemDeadline();
    if (!stored) {
      // By default, if no deadline is set, assume it was set to 3 days from initial but let's just assume it's NOT expired or maybe it is. Wait, the original code defaults to now + 3 days. So not expired.
      return false; 
    }
    return new Date(stored).getTime() - new Date().getTime() <= 0;
  }
`;

code = code.replace(
  /public static getSystemDeadline\(\): string \| null \{\n\s*return localStorage\.getItem\(SYSTEM_DEADLINE_KEY\);\n\s*\}/,
  replacement
);

fs.writeFileSync('src/services/storageService.ts', code);
