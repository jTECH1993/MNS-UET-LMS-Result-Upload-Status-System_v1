const fs = require('fs');
let code = fs.readFileSync('src/services/authService.ts', 'utf8');

code = code.replace(/password: 'Qwe12!@!@',/g, "password: SecurityHelper.hashPassword('Qwe12!@!@'),");
code = code.replace(/password: 'JHG45\$%xz',/g, "password: SecurityHelper.hashPassword('JHG45$%xz'),");

fs.writeFileSync('src/services/authService.ts', code);
