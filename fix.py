import re

with open('src/services/authService.ts', 'r') as f:
    code = f.read()

# find where const SecurityHelper starts
bad_str = "const SecurityHelper = {\n  isHashed: (str: string) => str.startsWith('$2a"
if bad_str in code:
    code = code.split(bad_str)[0] + \
"""const SecurityHelper = {
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
  public static getAccounts(): UserAccount[] {
""" + code.split(bad_str)[1]

with open('src/services/authService.ts', 'w') as f:
    f.write(code)
