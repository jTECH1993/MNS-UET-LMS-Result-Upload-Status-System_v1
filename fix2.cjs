const fs = require('fs');
let code = fs.readFileSync('src/services/authService.ts', 'utf8');

const badStr = "const SecurityHelper = {\n  isHashed: (str: string) => str.startsWith('$2a  // Retrieve all accounts from localStorage or seed defaults\n    public static getAccounts(): UserAccount[] {";

const goodStr = `const SecurityHelper = {
  isHashed: (str: string) => str.startsWith('$2a$') || str.startsWith('$2b$') || str.startsWith('$2y$'),
  verifyPassword: (input: string, stored: string) => {
    if (SecurityHelper.isHashed(stored)) {
      return bcrypt.compareSync(input, stored);
    }
    return input === stored;
  },
  hashPassword: (input: string) => {
    return bcrypt.hashSync(input, 10);
  }
};

export class AuthService {
  // Retrieve all accounts from localStorage or seed defaults
  public static getAccounts(): UserAccount[] {`;

if (code.includes(badStr)) {
    code = code.replace(badStr, goodStr);
} else {
    console.log("Could not find the exact bad string. Finding by regex...");
    const regex = /const SecurityHelper = \{\s*isHashed:[\s\S]*?public static getAccounts\(\): UserAccount\[\] \{/;
    code = code.replace(regex, goodStr);
}

fs.writeFileSync('src/services/authService.ts', code);
