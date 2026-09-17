const fs = require('fs');
let code = fs.readFileSync('src/services/authService.ts', 'utf8');

code = code.replace(/const SecurityHelper = \{\n\s*isHashed: \(str: string\) => str\.startsWith\('\$2a  \/\/ Retrieve all accounts from localStorage or seed defaults\n\s*public static getAccounts\(\): UserAccount\[\] \{/m, 
`const SecurityHelper = {
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
  public static getAccounts(): UserAccount[] {`
);

fs.writeFileSync('src/services/authService.ts', code);
