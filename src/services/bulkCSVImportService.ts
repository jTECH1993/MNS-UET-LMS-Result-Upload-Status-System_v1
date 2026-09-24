import { SubjectRow, LMSStatus, AcademicShift, SubmissionRecord } from '../types';
import { StorageService } from './storageService';
import { AuditTrailService } from './auditTrailService';
import {
  UNIVERSITY_DEPARTMENTS,
  DEFAULT_ACADEMIC_SESSIONS,
  ACADEMIC_SEMESTERS,
  getRecordKey,
} from '../data/departmentsData';

export interface RawCSVRow {
  rowIndex: number; // 1-based original line number
  rawText: string;
  department?: string;
  program?: string;
  degreeLevel?: string;
  shift?: string;
  section?: string;
  session?: string;
  semester?: string;
  courseCode: string;
  subjectTitle: string;
  creditHours?: string;
  status?: string;
  uploadedBy?: string;
  dateUploaded?: string;
  remarks?: string;
}

export interface ValidationIssue {
  field:
    | 'courseCode'
    | 'session'
    | 'semester'
    | 'department'
    | 'program'
    | 'shift'
    | 'section'
    | 'creditHours'
    | 'status'
    | 'general';
  severity: 'error' | 'warning';
  message: string;
}

export interface ValidatedCSVRow {
  rowNumber: number;
  rawRow: RawCSVRow;
  isValid: boolean;
  issues: ValidationIssue[];
  normalized: {
    department: string;
    program: string;
    degreeLevel: string;
    shift: AcademicShift;
    section: string;
    session: string;
    semester: string;
    courseCode: string;
    subjectTitle: string;
    creditHours: string;
    status: LMSStatus;
    uploadedBy: string;
    dateUploaded: string;
    remarks: string;
  };
  matchedExistingInDB?: boolean;
  catalogSource?: string;
}

export interface BulkValidationSummary {
  totalRows: number;
  validRowsCount: number;
  failedRowsCount: number;
  warningCount: number;
  passRate: number; // 0 - 100 percentage
  rows: ValidatedCSVRow[];
  departmentsInvolved: string[];
  programsInvolved: string[];
  sessionsInvolved: string[];
  semestersInvolved: string[];
}

export interface ImportContext {
  defaultDepartment?: string;
  defaultProgram?: string;
  defaultDegreeLevel?: string;
  defaultShift?: AcademicShift;
  defaultSection?: string;
  defaultSession?: string;
  defaultSemester?: string;
}

// Recognized discipline/department course code prefixes across MNS-UET
const RECOGNIZED_COURSE_PREFIXES: Record<string, string> = {
  // Computer Science & Software
  CS: 'Department of Computer Science',
  SE: 'Department of Computer Science',
  IT: 'Department of Computer Science',
  AI: 'Department of Computer Science',
  DS: 'Department of Computer Science',
  CY: 'Department of Computer Science',
  IOT: 'Department of Computer Science',
  // Electrical Engineering
  EE: 'Department of Electrical Engineering & Technology',
  EET: 'Department of Electrical Engineering & Technology',
  ET: 'Department of Electrical Engineering & Technology',
  // Mechanical Engineering
  ME: 'Department of Mechanical Engineering & Technology',
  MET: 'Department of Mechanical Engineering & Technology',
  MT: 'Department of Mechanical Engineering & Technology',
  // Civil Engineering
  CE: 'Department of Civil Engineering & Technology',
  CET: 'Department of Civil Engineering & Technology',
  BAE: 'Department of Civil Engineering & Technology',
  AE: 'Department of Civil Engineering & Technology',
  // Chemical Engineering
  CHE: 'Department of Chemical Engineering & Technology',
  CHET: 'Department of Chemical Engineering & Technology',
  FE: 'Department of Chemical Engineering & Technology',
  // Management Sciences
  MS: 'Department of Management Sciences',
  BBA: 'Department of Management Sciences',
  MGT: 'Department of Management Sciences',
  FIN: 'Department of Management Sciences',
  MKT: 'Department of Management Sciences',
  ACT: 'Department of Management Sciences',
  ECO: 'Department of Management Sciences',
  HRM: 'Department of Management Sciences',
  // Basic Sciences & Humanities (Institution-wide general courses)
  BSH: 'Department of Basic Sciences & Humanities',
  MTH: 'Department of Basic Sciences & Humanities',
  MA: 'Department of Basic Sciences & Humanities',
  PHY: 'Department of Basic Sciences & Humanities',
  CH: 'Department of Basic Sciences & Humanities',
  ES: 'Department of Basic Sciences & Humanities',
  ENG: 'Department of Basic Sciences & Humanities',
  EN: 'Department of Basic Sciences & Humanities',
  HU: 'Department of Basic Sciences & Humanities',
  ISL: 'Department of Basic Sciences & Humanities',
  PAK: 'Department of Basic Sciences & Humanities',
  GE: 'Department of Basic Sciences & Humanities',
  QT: 'Department of Basic Sciences & Humanities',
  SS: 'Department of Basic Sciences & Humanities',
};

export class BulkCSVImportService {
  /**
   * Split a CSV string line respecting double quotes.
   */
  public static splitCSVLine(line: string, delimiter: string = ','): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  }

  /**
   * Detect the most likely delimiter from a CSV string.
   */
  public static detectDelimiter(firstFewLines: string[]): string {
    const counts = { ',': 0, '\t': 0, ';': 0, '|': 0 };
    firstFewLines.forEach((line) => {
      let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') inQuotes = !inQuotes;
        else if (!inQuotes && ch in counts) {
          counts[ch as keyof typeof counts]++;
        }
      }
    });

    if (counts['\t'] > counts[','] && counts['\t'] > counts[';']) return '\t';
    if (counts[';'] > counts[',']) return ';';
    if (counts['|'] > counts[',']) return '|';
    return ',';
  }

  /**
   * Parses raw CSV or tabular text into raw structured rows.
   */
  public static parseRawCSV(rawText: string, context?: ImportContext): RawCSVRow[] {
    if (!rawText || !rawText.trim()) return [];

    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const delimiter = this.detectDelimiter(lines.slice(0, 5));
    const rawRows: RawCSVRow[] = [];

    // Analyze first line to determine if it is a header row
    const firstLineCols = this.splitCSVLine(lines[0], delimiter).map((c) =>
      c.replace(/^["']|["']$/g, '').trim()
    );

    const headerColMap: Record<string, number> = {};
    let isHeader = false;

    const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

    firstLineCols.forEach((col, idx) => {
      const norm = normalizeHeader(col);
      if (
        norm.includes('coursecode') ||
        norm.includes('subjectcode') ||
        norm === 'code' ||
        norm === 'course'
      ) {
        headerColMap['courseCode'] = idx;
        isHeader = true;
      } else if (
        norm.includes('coursetitle') ||
        norm.includes('subjecttitle') ||
        norm === 'title' ||
        norm === 'subject' ||
        norm === 'name'
      ) {
        headerColMap['subjectTitle'] = idx;
        isHeader = true;
      } else if (
        norm.includes('department') ||
        norm === 'dept' ||
        norm === 'faculty'
      ) {
        headerColMap['department'] = idx;
        isHeader = true;
      } else if (norm.includes('program') || norm === 'prog' || norm === 'degree') {
        headerColMap['program'] = idx;
        isHeader = true;
      } else if (
        norm.includes('credithour') ||
        norm === 'crhrs' ||
        norm === 'credits' ||
        norm === 'ch'
      ) {
        headerColMap['creditHours'] = idx;
        isHeader = true;
      } else if (norm.includes('shift') || norm === 'sessiontime') {
        headerColMap['shift'] = idx;
        isHeader = true;
      } else if (norm === 'section' || norm === 'sec') {
        headerColMap['section'] = idx;
        isHeader = true;
      } else if (
        norm.includes('session') ||
        norm.includes('batch') ||
        norm === 'cohort'
      ) {
        headerColMap['session'] = idx;
        isHeader = true;
      } else if (norm.includes('semester') || norm === 'sem' || norm === 'term') {
        headerColMap['semester'] = idx;
        isHeader = true;
      } else if (
        norm.includes('status') ||
        norm.includes('lmsstatus') ||
        norm.includes('resultstatus')
      ) {
        headerColMap['status'] = idx;
        isHeader = true;
      } else if (
        norm.includes('uploadedby') ||
        norm.includes('instructor') ||
        norm.includes('teacher') ||
        norm.includes('faculty')
      ) {
        headerColMap['uploadedBy'] = idx;
        isHeader = true;
      } else if (norm.includes('dateuploaded') || norm === 'date') {
        headerColMap['dateUploaded'] = idx;
        isHeader = true;
      } else if (
        norm.includes('remark') ||
        norm.includes('comment') ||
        norm === 'notes'
      ) {
        headerColMap['remarks'] = idx;
        isHeader = true;
      }
    });

    const startIndex = isHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check if line is an LMS Portal formatted line:
      // e.g. "CS-111-Programming Fundamentals - A - Morning - Both - Asim Ali"
      if (line.includes(' - ') && !line.includes(',')) {
        const parts = line.split(/\s+-\s+/).map((p) => p.trim());
        if (parts.length >= 3) {
          const codeAndTitle = parts[0];
          let courseCode = '';
          let subjectTitle = '';

          const codeMatch = codeAndTitle.match(/^([A-Za-z]{2,6}-\d{2,4}[A-Za-z]?)-(.*)$/);
          if (codeMatch) {
            courseCode = codeMatch[1].trim();
            subjectTitle = codeMatch[2].trim();
            if (subjectTitle.startsWith('L-') || subjectTitle.startsWith('l-')) {
              subjectTitle = subjectTitle.substring(2).trim() + ' (Lab)';
            }
          } else {
            const firstDash = codeAndTitle.indexOf('-');
            if (firstDash !== -1) {
              courseCode = codeAndTitle.substring(0, firstDash).trim();
              subjectTitle = codeAndTitle.substring(firstDash + 1).trim();
            } else {
              courseCode = codeAndTitle;
              subjectTitle = codeAndTitle;
            }
          }

          const secCandidate = parts[1].replace(/^(sec|section)\s*/i, '').trim().toUpperCase();
          const section = /^[A-Z0-9]{1,3}$/.test(secCandidate)
            ? secCandidate
            : context?.defaultSection || 'A';
          const shift = parts[2] || context?.defaultShift || 'Morning';
          const teacher = parts[4] || parts[3] || '';

          rawRows.push({
            rowIndex: i + 1,
            rawText: line,
            department: context?.defaultDepartment,
            program: context?.defaultProgram,
            degreeLevel: context?.defaultDegreeLevel,
            shift,
            section,
            session: context?.defaultSession || '2023',
            semester: context?.defaultSemester || '1',
            courseCode,
            subjectTitle,
            creditHours: courseCode.toUpperCase().endsWith('L') ? '1' : '3',
            status: 'Uploaded',
            uploadedBy: teacher,
            remarks: 'LMS Portal Import',
          });
          continue;
        }
      }

      // Standard CSV parsing
      const cols = this.splitCSVLine(line, delimiter).map((c) =>
        c.replace(/^["']|["']$/g, '').trim()
      );
      if (cols.length === 0 || cols.every((c) => !c)) continue;

      if (isHeader) {
        const getVal = (field: string) => {
          const idx = headerColMap[field];
          return idx !== undefined && cols[idx] !== undefined ? cols[idx] : undefined;
        };

        const courseCode = getVal('courseCode') || cols[0] || '';
        const subjectTitle = getVal('subjectTitle') || cols[1] || '';

        rawRows.push({
          rowIndex: i + 1,
          rawText: line,
          department: getVal('department') || context?.defaultDepartment,
          program: getVal('program') || context?.defaultProgram,
          degreeLevel: getVal('degreeLevel') || context?.defaultDegreeLevel,
          shift: getVal('shift') || context?.defaultShift || 'Morning',
          section: getVal('section') || context?.defaultSection || 'A',
          session: getVal('session') || context?.defaultSession,
          semester: getVal('semester') || context?.defaultSemester,
          courseCode,
          subjectTitle,
          creditHours: getVal('creditHours') || (courseCode.toUpperCase().endsWith('L') ? '1' : '3'),
          status: getVal('status') || 'Uploaded',
          uploadedBy: getVal('uploadedBy') || '',
          dateUploaded: getVal('dateUploaded'),
          remarks: getVal('remarks') || '',
        });
      } else {
        // Fallback positional detection
        // Format A: CourseCode, Title, [CreditHours], [Section], [Shift], [Status], [UploadedBy], [Remarks]
        // or Format B: Master export format (Department, Program, Shift, Section, Session, Semester, ...)
        if (cols.length >= 12 && cols[0].toLowerCase().includes('department')) {
          // Looks like master export
          rawRows.push({
            rowIndex: i + 1,
            rawText: line,
            department: cols[0],
            program: cols[1],
            degreeLevel: cols[2],
            shift: cols[3],
            section: cols[4],
            session: cols[5],
            semester: cols[6],
            courseCode: cols[12] || '',
            subjectTitle: cols[13] || '',
            creditHours: cols[14] || '3',
            status: cols[16] || 'Uploaded',
            dateUploaded: cols[17] || '',
            uploadedBy: cols[18] || '',
            remarks: cols[19] || '',
          });
        } else {
          // Compact course result row
          const courseCode = cols[0] || '';
          const subjectTitle = cols[1] || '';
          let section = context?.defaultSection || 'A';
          let creditHours = '3';
          let uploadedBy = '';
          let status = 'Uploaded';
          let remarks = '';
          let session = context?.defaultSession;
          let semester = context?.defaultSemester;

          // Check if col[2] is section or credit hour
          if (cols.length >= 3) {
            const col2 = cols[2].toUpperCase().trim();
            if (/^[A-Z]$/.test(col2)) {
              section = col2;
              creditHours = cols[3] || '3';
              uploadedBy = cols[4] || '';
              status = cols[5] || 'Uploaded';
              remarks = cols[6] || '';
            } else if (/^\d+(\.\d+)?$/.test(col2)) {
              creditHours = col2;
              uploadedBy = cols[3] || '';
              status = cols[4] || 'Uploaded';
              remarks = cols[5] || '';
              if (cols[6] && /^[A-Z]$/i.test(cols[6])) {
                section = cols[6].toUpperCase();
              }
            }
          }

          rawRows.push({
            rowIndex: i + 1,
            rawText: line,
            department: context?.defaultDepartment,
            program: context?.defaultProgram,
            degreeLevel: context?.defaultDegreeLevel,
            shift: context?.defaultShift || 'Morning',
            section,
            session,
            semester,
            courseCode,
            subjectTitle,
            creditHours,
            status,
            uploadedBy,
            remarks,
          });
        }
      }
    }

    return rawRows;
  }

  /**
   * Validates raw CSV rows against the database and academic standards.
   */
  public static validateRows(
    rawRows: RawCSVRow[],
    context?: ImportContext
  ): BulkValidationSummary {
    const allStoredSubmissions = StorageService.getAllSubmissions();
    const activeSessionsFromDB = StorageService.getActiveSessions();

    // Pool all known sessions in the database
    const dbKnownSessions = new Set<string>([
      ...activeSessionsFromDB,
      ...DEFAULT_ACADEMIC_SESSIONS,
    ]);
    allStoredSubmissions.forEach((sub) => {
      if (sub.session) dbKnownSessions.add(sub.session.trim());
    });

    // Pool all existing courses previously stored in the database
    const dbCourseCodes = new Map<string, { title: string; department: string; program: string }>();
    allStoredSubmissions.forEach((sub) => {
      (sub.subjects || []).forEach((s) => {
        if (s.courseCode && s.courseCode.trim()) {
          const cleanCode = s.courseCode.trim().toUpperCase();
          if (!dbCourseCodes.has(cleanCode)) {
            dbCourseCodes.set(cleanCode, {
              title: s.subjectTitle || '',
              department: sub.department || '',
              program: sub.program || '',
            });
          }
        }
      });
    });

    const validatedRows: ValidatedCSVRow[] = [];
    const departmentsSet = new Set<string>();
    const programsSet = new Set<string>();
    const sessionsSet = new Set<string>();
    const semestersSet = new Set<string>();

    let validRowsCount = 0;
    let failedRowsCount = 0;
    let warningCount = 0;

    // Track uniqueness per section offering within this batch
    // Key: department__program__shift__session__semester__section__courseCode
    const seenOfferings = new Map<string, number>();

    rawRows.forEach((raw) => {
      const issues: ValidationIssue[] = [];
      let isRowValid = true;

      // 1. DEPARTMENT & PROGRAM VALIDATION
      let resolvedDept = (raw.department || context?.defaultDepartment || '').trim();
      let resolvedProg = (raw.program || context?.defaultProgram || '').trim();
      let matchedDeptGroup = UNIVERSITY_DEPARTMENTS.find(
        (d) =>
          d.name.toLowerCase() === resolvedDept.toLowerCase() ||
          d.code.toLowerCase() === resolvedDept.toLowerCase()
      );

      if (!matchedDeptGroup && resolvedDept) {
        // Partial match
        matchedDeptGroup = UNIVERSITY_DEPARTMENTS.find(
          (d) =>
            d.name.toLowerCase().includes(resolvedDept.toLowerCase()) ||
            resolvedDept.toLowerCase().includes(d.code.toLowerCase())
        );
      }

      if (!matchedDeptGroup) {
        // Fallback to default department or first department
        if (context?.defaultDepartment) {
          matchedDeptGroup = UNIVERSITY_DEPARTMENTS.find(
            (d) => d.name === context.defaultDepartment
          );
        }
        if (!matchedDeptGroup) {
          matchedDeptGroup = UNIVERSITY_DEPARTMENTS[0];
          issues.push({
            field: 'department',
            severity: 'warning',
            message: `Department not specified; defaulted to '${matchedDeptGroup.name}'.`,
          });
        }
      }
      resolvedDept = matchedDeptGroup.name;
      departmentsSet.add(resolvedDept);

      // Validate program within department
      if (!resolvedProg) {
        resolvedProg =
          context?.defaultProgram || matchedDeptGroup.programs[0]?.name || 'BS Computer Science';
        issues.push({
          field: 'program',
          severity: 'warning',
          message: `Program not specified; defaulted to '${resolvedProg}'.`,
        });
      } else {
        const foundProg = matchedDeptGroup.programs.find(
          (p) => p.name.toLowerCase() === resolvedProg.toLowerCase()
        );
        if (!foundProg) {
          // Check if program exists in another department
          let altDept = UNIVERSITY_DEPARTMENTS.find((d) =>
            d.programs.some((p) => p.name.toLowerCase() === resolvedProg.toLowerCase())
          );
          if (altDept) {
            matchedDeptGroup = altDept;
            resolvedDept = altDept.name;
            issues.push({
              field: 'program',
              severity: 'warning',
              message: `Program '${resolvedProg}' belongs to '${altDept.name}'; auto-aligned.`,
            });
          } else {
            issues.push({
              field: 'program',
              severity: 'warning',
              message: `Program '${resolvedProg}' is not in standard offering list; proceeding with custom entry.`,
            });
          }
        }
      }
      programsSet.add(resolvedProg);

      // 2. ACADEMIC SESSION VALIDATION AGAINST DATABASE
      let resolvedSession = (raw.session || context?.defaultSession || '2023').trim();
      let sessionValid = false;

      if (!resolvedSession) {
        issues.push({
          field: 'session',
          severity: 'error',
          message: 'Academic Session is required but was blank.',
        });
        isRowValid = false;
      } else {
        // Validate against database registered sessions or format:
        // Must be year format like 2020-2024, 2021, 2022, 2023, 2024, 2025, 2026
        const sessionYearMatch = resolvedSession.match(/\b(20\d{2})\b/);
        const yearNum = sessionYearMatch ? parseInt(sessionYearMatch[1], 10) : 0;

        const isKnownInDB = dbKnownSessions.has(resolvedSession);
        const isYearReasonable = yearNum >= 2018 && yearNum <= 2032;

        if (isKnownInDB || isYearReasonable) {
          sessionValid = true;
          if (!activeSessionsFromDB.includes(resolvedSession)) {
            issues.push({
              field: 'session',
              severity: 'warning',
              message: `Session '${resolvedSession}' is in database archive but not in currently active batch filter.`,
            });
          }
        } else {
          issues.push({
            field: 'session',
            severity: 'error',
            message: `Invalid Academic Session: '${resolvedSession}' is not recognized in the university database. Active registered sessions: ${Array.from(
              dbKnownSessions
            ).join(', ')}.`,
          });
          isRowValid = false;
        }
      }
      sessionsSet.add(resolvedSession);

      // 3. ACADEMIC SEMESTER VALIDATION AGAINST DATABASE
      let resolvedSemester = (raw.semester || context?.defaultSemester || '1').trim();
      let semesterNumber = 0;

      // Normalize Roman numerals and text: e.g. "Sem 1", "1st", "I", "II"
      const semUpper = resolvedSemester.toUpperCase();
      if (semUpper === 'I' || semUpper === '1ST' || semUpper === '1') semesterNumber = 1;
      else if (semUpper === 'II' || semUpper === '2ND' || semUpper === '2') semesterNumber = 2;
      else if (semUpper === 'III' || semUpper === '3RD' || semUpper === '3') semesterNumber = 3;
      else if (semUpper === 'IV' || semUpper === '4TH' || semUpper === '4') semesterNumber = 4;
      else if (semUpper === 'V' || semUpper === '5TH' || semUpper === '5') semesterNumber = 5;
      else if (semUpper === 'VI' || semUpper === '6TH' || semUpper === '6') semesterNumber = 6;
      else if (semUpper === 'VII' || semUpper === '7TH' || semUpper === '7') semesterNumber = 7;
      else if (semUpper === 'VIII' || semUpper === '8TH' || semUpper === '8') semesterNumber = 8;
      else {
        const parsed = parseInt(resolvedSemester.replace(/\D/g, ''), 10);
        if (!isNaN(parsed)) semesterNumber = parsed;
      }

      if (semesterNumber < 1 || semesterNumber > 8) {
        issues.push({
          field: 'semester',
          severity: 'error',
          message: `Invalid Academic Semester: '${resolvedSemester}' must be between 1 and 8 (aligned with institutional 4-year degree catalog).`,
        });
        isRowValid = false;
      } else {
        resolvedSemester = String(semesterNumber);
      }
      semestersSet.add(resolvedSemester);

      // 4. SUBJECT CODE VALIDATION AGAINST DATABASE & CATALOG
      const rawCode = (raw.courseCode || '').trim();
      let resolvedCourseCode = rawCode.toUpperCase();
      let matchedInDB = false;
      let catalogSource = '';

      if (!rawCode) {
        issues.push({
          field: 'courseCode',
          severity: 'error',
          message: 'Subject Code is missing or blank. Every result entry must specify a course code.',
        });
        isRowValid = false;
      } else {
        // Check pattern: e.g. CS-101, CS-111L, MTH-114, EE-201, CE-101, ME-111, BBA-101
        const patternMatch = resolvedCourseCode.match(
          /^([A-Z]{2,6})[ -]?(\d{2,4})([A-Z]{0,2})$/i
        );

        if (!patternMatch) {
          // Invalid format: e.g. 12345, TEST, ---, etc.
          issues.push({
            field: 'courseCode',
            severity: 'error',
            message: `Invalid Subject Code format: '${rawCode}'. Must follow standard university format (e.g. CS-101, EE-201, MTH-114).`,
          });
          isRowValid = false;
        } else {
          const prefix = patternMatch[1].toUpperCase();
          const num = patternMatch[2];
          const suffix = patternMatch[3] ? patternMatch[3].toUpperCase() : '';
          resolvedCourseCode = `${prefix}-${num}${suffix}`;

          // Check if prefix is recognized
          const recognizedFaculty = RECOGNIZED_COURSE_PREFIXES[prefix];
          if (dbCourseCodes.has(resolvedCourseCode)) {
            matchedInDB = true;
            catalogSource = 'Database Verified';
          } else if (recognizedFaculty) {
            catalogSource = `Accredited Discipline (${prefix} - ${recognizedFaculty.replace(
              'Department of ',
              ''
            )})`;
          } else {
            // Unrecognized prefix
            issues.push({
              field: 'courseCode',
              severity: 'error',
              message: `Unrecognized Subject Code: Prefix '${prefix}' is not registered in the university course catalog database.`,
            });
            isRowValid = false;
          }
        }
      }

      // 5. SUBJECT TITLE
      let resolvedTitle = (raw.subjectTitle || '').trim();
      if (!resolvedTitle) {
        if (dbCourseCodes.has(resolvedCourseCode)) {
          resolvedTitle = dbCourseCodes.get(resolvedCourseCode)!.title;
          issues.push({
            field: 'general',
            severity: 'warning',
            message: `Subject title was blank; auto-populated '${resolvedTitle}' from database records.`,
          });
        } else {
          resolvedTitle = `Course ${resolvedCourseCode || 'Subject'}`;
          issues.push({
            field: 'general',
            severity: 'warning',
            message: `Subject title was omitted; generated '${resolvedTitle}'.`,
          });
        }
      }

      // 6. SHIFT & SECTION
      let resolvedShift: AcademicShift = 'Morning';
      const shiftCandidate = (raw.shift || context?.defaultShift || 'Morning').toLowerCase();
      if (shiftCandidate.includes('eve') || shiftCandidate.includes('replica')) {
        resolvedShift = 'Evening';
      }

      let resolvedSection = (raw.section || context?.defaultSection || 'A')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
      if (!resolvedSection) resolvedSection = 'A';

      // 7. DUPLICATE CHECK WITHIN THIS BATCH / SECTION
      const duplicateKey = `${resolvedDept}__${resolvedProg}__${resolvedShift}__${resolvedSession}__${resolvedSemester}__${resolvedSection}__${resolvedCourseCode}`;
      if (seenOfferings.has(duplicateKey)) {
        const prevRow = seenOfferings.get(duplicateKey);
        issues.push({
          field: 'courseCode',
          severity: 'error',
          message: `Duplicate Subject Code: '${resolvedCourseCode}' is already present in this upload on row ${prevRow} for Section ${resolvedSection}.`,
        });
        isRowValid = false;
      } else {
        seenOfferings.set(duplicateKey, raw.rowIndex);
      }

      // 8. CREDIT HOURS
      let resolvedCreditHours = (raw.creditHours || '').trim();
      if (!resolvedCreditHours) {
        resolvedCreditHours = resolvedCourseCode.endsWith('L') ? '1' : '3';
      } else {
        const crNum = parseFloat(resolvedCreditHours);
        if (isNaN(crNum) || crNum <= 0 || crNum > 6) {
          issues.push({
            field: 'creditHours',
            severity: 'warning',
            message: `Unusual credit hour '${resolvedCreditHours}'; normalized to 3.`,
          });
          resolvedCreditHours = '3';
        }
      }

      // 9. LMS STATUS NORMALIZATION
      let resolvedStatus: LMSStatus = 'Uploaded';
      const statusRaw = (raw.status || '').toLowerCase().trim();
      if (statusRaw.includes('pending') || statusRaw === 'pnd') {
        resolvedStatus = 'Pending';
      } else if (
        statusRaw.includes('progress') ||
        statusRaw.includes('eval') ||
        statusRaw.includes('marking')
      ) {
        resolvedStatus = 'In Progress';
      } else if (
        statusRaw.includes('not applicable') ||
        statusRaw === 'n/a' ||
        statusRaw === 'na'
      ) {
        resolvedStatus = 'Not Applicable';
      } else if (
        statusRaw.includes('upload') ||
        statusRaw === 'complete' ||
        statusRaw === 'completed' ||
        statusRaw === 'done' ||
        statusRaw === 'yes'
      ) {
        resolvedStatus = 'Uploaded';
      }

      // 10. DATE & REMARKS
      const resolvedDate =
        raw.dateUploaded ||
        (resolvedStatus === 'Uploaded' ? new Date().toISOString().split('T')[0] : '');
      const resolvedRemarks =
        raw.remarks ||
        (resolvedStatus === 'Uploaded' ? 'Imported via Bulk CSV Sync' : 'Pending upload');
      const resolvedUploadedBy = raw.uploadedBy || 'Course Instructor';

      // Update counters
      if (isRowValid) {
        validRowsCount++;
      } else {
        failedRowsCount++;
      }
      warningCount += issues.filter((i) => i.severity === 'warning').length;

      validatedRows.push({
        rowNumber: raw.rowIndex,
        rawRow: raw,
        isValid: isRowValid,
        issues,
        normalized: {
          department: resolvedDept,
          program: resolvedProg,
          degreeLevel: raw.degreeLevel || context?.defaultDegreeLevel || 'BS',
          shift: resolvedShift,
          section: resolvedSection,
          session: resolvedSession,
          semester: resolvedSemester,
          courseCode: resolvedCourseCode,
          subjectTitle: resolvedTitle,
          creditHours: resolvedCreditHours,
          status: resolvedStatus,
          uploadedBy: resolvedUploadedBy,
          dateUploaded: resolvedDate,
          remarks: resolvedRemarks,
        },
        matchedExistingInDB: matchedInDB,
        catalogSource,
      });
    });

    const totalRows = rawRows.length;
    const passRate =
      totalRows > 0 ? Math.round((validRowsCount / totalRows) * 100) : 0;

    return {
      totalRows,
      validRowsCount,
      failedRowsCount,
      warningCount,
      passRate,
      rows: validatedRows,
      departmentsInvolved: Array.from(departmentsSet),
      programsInvolved: Array.from(programsSet),
      sessionsInvolved: Array.from(sessionsSet),
      semestersInvolved: Array.from(semestersSet),
    };
  }

  /**
   * Commits validated CSV rows to the database.
   */
  public static async commitValidatedRows(
    summary: BulkValidationSummary,
    mode: 'skip-failed' | 'strict' = 'skip-failed',
    writeMode: 'merge' | 'replace' = 'merge',
    actorName: string = 'Authorized Academic Officer',
    actorRole: string = 'HOD / System Coordinator'
  ): Promise<{
    success: boolean;
    committedCount: number;
    skippedCount: number;
    affectedProgramsCount: number;
    recordsCount: number;
    errorMessage?: string;
  }> {
    if (mode === 'strict' && summary.failedRowsCount > 0) {
      return {
        success: false,
        committedCount: 0,
        skippedCount: summary.totalRows,
        affectedProgramsCount: 0,
        recordsCount: 0,
        errorMessage: `Strict Mode Violation: ${summary.failedRowsCount} row(s) failed validation. Resolve all errors before committing.`,
      };
    }

    const rowsToCommit = summary.rows.filter((r) => r.isValid);
    if (rowsToCommit.length === 0) {
      return {
        success: false,
        committedCount: 0,
        skippedCount: summary.totalRows,
        affectedProgramsCount: 0,
        recordsCount: 0,
        errorMessage: 'No valid rows available to commit to the database.',
      };
    }

    // Group rows by target SubmissionRecord key:
    // department + program + degreeLevel + shift + session + semester + section
    const grouped = new Map<string, ValidatedCSVRow[]>();

    rowsToCommit.forEach((r) => {
      const n = r.normalized;
      const groupKey = `${n.department}__${n.program}__${n.degreeLevel}__${n.shift}__${n.session}__${n.semester}__${n.section}`;
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey)!.push(r);
    });

    const recordsToSave: SubmissionRecord[] = [];
    const affectedPrograms = new Set<string>();

    grouped.forEach((rowsInGroup) => {
      const first = rowsInGroup[0].normalized;
      affectedPrograms.add(first.program);

      // Check for existing record in database
      const existing = StorageService.getSubmission(
        first.department,
        first.program,
        first.degreeLevel,
        first.shift,
        first.session,
        first.semester,
        first.section
      );

      const newSubjectRows: SubjectRow[] = rowsInGroup.map((r, i) => {
        const n = r.normalized;
        return {
          id: `subj_csv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${i}`,
          courseCode: n.courseCode,
          subjectTitle: n.subjectTitle,
          creditHours: n.creditHours,
          sectionShift: `${n.shift} - Sem ${n.semester} (Sec ${n.section})`,
          status: n.status,
          dateUploaded: n.dateUploaded,
          uploadedBy: n.uploadedBy,
          remarks: n.remarks,
        };
      });

      let finalSubjects: SubjectRow[] = [];

      if (writeMode === 'replace' || !existing) {
        finalSubjects = newSubjectRows;
      } else {
        // Merge mode: update existing course with same code or append new
        const existingMap = new Map<string, SubjectRow>();
        (existing.subjects || []).forEach((s) => {
          if (s.courseCode) {
            existingMap.set(s.courseCode.trim().toUpperCase(), s);
          }
        });

        // Overlay new courses
        newSubjectRows.forEach((newSub) => {
          existingMap.set(newSub.courseCode.trim().toUpperCase(), newSub);
        });

        finalSubjects = Array.from(existingMap.values());
      }

      const recKey = getRecordKey(
        first.department,
        first.program,
        first.degreeLevel,
        first.shift,
        first.session,
        first.semester,
        first.section
      );

      const targetRecord: SubmissionRecord = {
        id: recKey,
        department: first.department,
        program: first.program,
        degreeLevel: first.degreeLevel,
        shift: first.shift,
        section: first.section,
        session: first.session,
        semester: first.semester,
        hodCoordinator: existing?.hodCoordinator || actorName,
        submissionDate: new Date().toISOString().split('T')[0],
        subjects: finalSubjects,
        accessedBy: actorName,
        userDesignation: actorRole,
        updatedAt: new Date().toISOString(),
        createdAt: existing?.createdAt || new Date().toISOString(),
        lastUpdatedByName: actorName,
        lastUpdatedByRole: actorRole,
      };

      recordsToSave.push(targetRecord);
    });

    try {
      // Atomic commit to Firebase and localStorage
      await StorageService.saveSubmissionsBatch(recordsToSave);

      // Log in Audit Trail
      AuditTrailService.logChange({
        action: 'UPDATED',
        actorName,
        actorRole,
        department: summary.departmentsInvolved[0] || 'Academic Affairs',
        program: summary.programsInvolved[0] || 'Multi-Program Import',
        summary: `Bulk CSV Import: Successfully validated and committed ${rowsToCommit.length} course results across ${recordsToSave.length} section offerings into database.`,
        details: rowsToCommit.slice(0, 10).map((r) => ({
          courseCode: r.normalized.courseCode,
          courseTitle: r.normalized.subjectTitle,
          field: 'LMS Status',
          newValue: r.normalized.status,
        })),
      });

      return {
        success: true,
        committedCount: rowsToCommit.length,
        skippedCount: summary.failedRowsCount,
        affectedProgramsCount: affectedPrograms.size,
        recordsCount: recordsToSave.length,
      };
    } catch (err: any) {
      console.error('Error committing validated rows to database:', err);
      return {
        success: false,
        committedCount: 0,
        skippedCount: summary.totalRows,
        affectedProgramsCount: 0,
        recordsCount: 0,
        errorMessage: err?.message || 'Database error occurred while committing records.',
      };
    }
  }

  /**
   * Generates and downloads a CSV report of the validation summary.
   */
  public static exportValidationReportCSV(
    summary: BulkValidationSummary,
    filename?: string
  ): void {
    const headers = [
      'Row #',
      'Validation Status',
      'Course Code',
      'Course Title',
      'Session',
      'Semester',
      'Department',
      'Program',
      'Shift',
      'Section',
      'Credit Hours',
      'LMS Status',
      'Uploaded By',
      'Verification / Issues',
    ];

    const rows = summary.rows.map((r) => {
      const issueTexts = r.issues.map((i) => `[${i.severity.toUpperCase()}] ${i.message}`).join('; ');
      return [
        String(r.rowNumber),
        r.isValid ? 'VALID' : 'FAILED',
        `"${r.normalized.courseCode || r.rawRow.courseCode}"`,
        `"${r.normalized.subjectTitle || r.rawRow.subjectTitle}"`,
        `"${r.normalized.session || r.rawRow.session || ''}"`,
        `"${r.normalized.semester || r.rawRow.semester || ''}"`,
        `"${r.normalized.department || r.rawRow.department || ''}"`,
        `"${r.normalized.program || r.rawRow.program || ''}"`,
        `"${r.normalized.shift}"`,
        `"${r.normalized.section}"`,
        `"${r.normalized.creditHours}"`,
        `"${r.normalized.status}"`,
        `"${r.normalized.uploadedBy || ''}"`,
        `"${issueTexts || (r.matchedExistingInDB ? 'Verified against Database Catalog' : 'Valid')}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download =
      filename ||
      `MNS_UET_Course_Validation_Summary_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generates sample CSV templates for user convenience.
   */
  public static getSampleStandardCSV(): string {
    return `Course Code,Course Title,Credit Hours,Section,Shift,Semester,Session,LMS Status,Uploaded By,Remarks
CS-101,Programming Fundamentals,4,A,Morning,1,2023,Uploaded,Dr. Tariq Mahmood,LMS portal verified
CS-102,Discrete Structures,3,A,Morning,1,2023,Uploaded,Engr. Usama Javed,Final results submitted
CS-103,Digital Logic & Design,4,A,Morning,1,2023,In Progress,Dr. M. Haris,Practical viva evaluation
MTH-114,Calculus & Analytical Geometry,3,A,Morning,1,2023,Uploaded,Prof. Dr. Zahid,Grade sheet verified
ENG-115,English Composition & Comprehension,3,A,Morning,1,2023,Uploaded,Ms. Ayesha Siddiqa,Tabulation complete
HU-101,Islamic & Pakistan Studies,2,A,Morning,1,2023,Pending,Mr. Abdul Rehman,Awaiting tabulation awards`;
  }

  public static getSampleMasterCSV(): string {
    return `Department,Program,Shift,Section,Session,Semester,Course Code,Course Title,Credit Hours,LMS Status,Uploaded By,Remarks
Department of Computer Science,BS Computer Science,Morning,A,2023,1,CS-101,Programming Fundamentals,4,Uploaded,Dr. Tariq Mahmood,Completed
Department of Computer Science,BS Computer Science,Morning,A,2023,1,CS-102,Discrete Structures,3,Uploaded,Engr. Usama Javed,Completed
Department of Electrical Engineering & Technology,B.Sc. Electrical Engineering,Morning,A,2023,1,EE-101,Basic Electrical Engineering,4,Uploaded,Dr. S. Raza,Verified
Department of Mechanical Engineering & Technology,B.Sc. Mechanical Engineering,Morning,A,2023,1,ME-111,Engineering Mechanics,4,In Progress,Dr. Farooq Ahmad,Practical pending`;
  }
}
