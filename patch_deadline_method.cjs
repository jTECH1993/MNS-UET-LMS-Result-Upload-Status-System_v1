const fs = require('fs');
let code = fs.readFileSync('src/services/storageService.ts', 'utf8');

const replacement = `
  public static getSystemDeadline(): string | null {
    return localStorage.getItem('mnsuet_system_deadline_v99');
  }

  public static isSystemDeadlineExpired(): boolean {
    const stored = this.getSystemDeadline();
    if (!stored) {
      return false; 
    }
    return new Date(stored).getTime() - new Date().getTime() <= 0;
  }
`;

code = code.replace(
  /public static getSystemDeadline\(\): string \| null \{\n\s*return localStorage\.getItem\('mnsuet_system_deadline_v99'\);\n\s*\}/,
  replacement
);

fs.writeFileSync('src/services/storageService.ts', code);
