const fs = require('fs');
let code = fs.readFileSync('src/services/authService.ts', 'utf8');

if (!code.includes('import bcrypt from')) {
    code = `import bcrypt from 'bcryptjs';\n` + code;
}

// Add helper functions just below imports
if (!code.includes('const SecurityHelper =')) {
    code = code.replace(/export class AuthService \{/, 
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

export class AuthService {`);
}

// 1. In getAccounts, hash the default account passwords when checking/creating them
code = code.replace(/if \(adminAcc\.password !== 'Qwe12!@!@'\) \{/, `if (!SecurityHelper.verifyPassword('Qwe12!@!@', adminAcc.password)) {`);
code = code.replace(/adminAcc\.password = 'Qwe12!@!@';/, `adminAcc.password = SecurityHelper.hashPassword('Qwe12!@!@');`);

code = code.replace(/if \(vcAcc\.password !== 'JHG45\$%xz'\) \{/, `if (!SecurityHelper.verifyPassword('JHG45$%xz', vcAcc.password)) {`);
code = code.replace(/vcAcc\.password = 'JHG45\$%xz';/, `vcAcc.password = SecurityHelper.hashPassword('JHG45$%xz');`);

code = code.replace(/if \(talhaCoordAcc\.password !== 'Qwe12!@!@'\) \{/, `if (!SecurityHelper.verifyPassword('Qwe12!@!@', talhaCoordAcc.password)) {`);
code = code.replace(/talhaCoordAcc\.password = 'Qwe12!@!@';/, `talhaCoordAcc.password = SecurityHelper.hashPassword('Qwe12!@!@');`);

// 2. In login
code = code.replace(/if \(account\.password !== cleanPass\) \{/, `if (!SecurityHelper.verifyPassword(cleanPass, account.password)) {`);
code = code.replace(/\/\/ Update last login timestamp/, 
    `// Auto-upgrade plaintext passwords
    if (!SecurityHelper.isHashed(account.password)) {
      account.password = SecurityHelper.hashPassword(cleanPass);
    }
    // Update last login timestamp`);

// 3. In registerAccount
code = code.replace(/password: cleanPass,/, `password: SecurityHelper.hashPassword(cleanPass),`);

// 4. In completePasswordReset
code = code.replace(/account\.password = newPassword\.trim\(\);/, `account.password = SecurityHelper.hashPassword(newPassword.trim());`);

// 5. In updateProfile
code = code.replace(/if \(data\.oldPassword\.trim\(\) !== account\.password\) \{/, `if (!SecurityHelper.verifyPassword(data.oldPassword.trim(), account.password)) {`);
code = code.replace(/account\.password = data\.newPassword\.trim\(\);/, `account.password = SecurityHelper.hashPassword(data.newPassword.trim());`);


fs.writeFileSync('src/services/authService.ts', code);
