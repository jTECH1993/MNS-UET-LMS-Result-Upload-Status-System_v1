const fs = require('fs');
let code = fs.readFileSync('src/services/authService.ts', 'utf8');

const securityHelper = `
const SecurityHelper = {
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
`;

code = code.replace(securityHelper.trim(), '');
code = code.replace(/export const DEFAULT_ACCOUNTS: UserAccount\[\] = \[/, securityHelper + '\nexport const DEFAULT_ACCOUNTS: UserAccount[] = [');

fs.writeFileSync('src/services/authService.ts', code);
