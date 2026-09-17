const fs = require('fs');
let code = fs.readFileSync('src/services/storageService.ts', 'utf8');

code = code.replace(
  /public static getSubmission\([\s\S]*?return Object\.values\(store\)\.find[\s\S]*?\|\| null;\n  \}/,
  `public static getSubmission(
    department: string,
    program: string,
    degreeLevel: string,
    shift: AcademicShift | string,
    session: string,
    semester: string,
    section: string
  ): SubmissionRecord | null {
    const key = getRecordKey(department, program, degreeLevel, shift as AcademicShift, session, semester, section);
    const store = this.getStore();
    return store[key] || null;
  }`
);

fs.writeFileSync('src/services/storageService.ts', code);
