import { AcademicShift, ProgramInfo, SubmissionRecord } from '../types';

export interface DepartmentGroup {
  name: string;
  code: string;
  programs: ProgramInfo[];
}

export const ACADEMIC_SHIFTS: { id: AcademicShift; label: string; description: string }[] = [
  { id: 'Morning', label: 'Morning', description: 'Regular Morning Session' },
  { id: 'Evening', label: 'Evening', description: 'Replica / Evening Session' },
];

export interface SemesterOption {
  id: string; // '1' - '8'
  label: string; // '1st Semester'
  shortLabel: string; // 'Sem 1'
  roman: string; // 'I'
}

export const ACADEMIC_SEMESTERS: SemesterOption[] = [
  { id: '1', label: '1st Semester', shortLabel: 'Sem 1', roman: 'I' },
  { id: '2', label: '2nd Semester', shortLabel: 'Sem 2', roman: 'II' },
  { id: '3', label: '3rd Semester', shortLabel: 'Sem 3', roman: 'III' },
  { id: '4', label: '4th Semester', shortLabel: 'Sem 4', roman: 'IV' },
  { id: '5', label: '5th Semester', shortLabel: 'Sem 5', roman: 'V' },
  { id: '6', label: '6th Semester', shortLabel: 'Sem 6', roman: 'VI' },
  { id: '7', label: '7th Semester', shortLabel: 'Sem 7', roman: 'VII' },
  { id: '8', label: '8th Semester', shortLabel: 'Sem 8', roman: 'VIII' },
];

export const DEFAULT_ACADEMIC_SESSIONS: string[] = ['2023', '2024', '2022', '2025'];

// Official Departments and Academic Programs from MNS-UET Multan (https://mnsuet.edu.pk/)
export const UNIVERSITY_DEPARTMENTS: DepartmentGroup[] = [
  {
    name: 'Department of Computer Science',
    code: 'CS',
    programs: [
      { name: 'BS Computer Science', degreeLevel: 'BS', department: 'Department of Computer Science', session2023: true, supportedShifts: ['Morning', 'Evening'] },
      { name: 'B.Sc. Software Engineering Technology (B.Tech)', degreeLevel: 'B.Tech', department: 'Department of Computer Science', session2023: true, supportedShifts: ['Morning', 'Evening'] },
      { name: 'BS Software Engineering', degreeLevel: 'BS', department: 'Department of Computer Science', session2023: false, supportedShifts: ['Morning', 'Evening'] },
      { name: 'BS Artificial Intelligence', degreeLevel: 'BS', department: 'Department of Computer Science', session2023: false, supportedShifts: ['Morning', 'Evening'] },
      { name: 'BS Cyber Security', degreeLevel: 'BS', department: 'Department of Computer Science', session2023: false, supportedShifts: ['Morning', 'Evening'] },
      { name: 'BS Data Science', degreeLevel: 'BS', department: 'Department of Computer Science', session2023: false, supportedShifts: ['Morning', 'Evening'] },
      { name: 'BS Information Technology', degreeLevel: 'BS', department: 'Department of Computer Science', session2023: false, supportedShifts: ['Morning', 'Evening'] },
      { name: 'BS Internet of Things (IoT)', degreeLevel: 'BS', department: 'Department of Computer Science', session2023: false, supportedShifts: ['Morning', 'Evening'] },
      { name: 'MS Computer Science', degreeLevel: 'MS', department: 'Department of Computer Science', session2023: false, supportedShifts: ['Morning', 'Evening'] },
      { name: 'PhD Computer Science', degreeLevel: 'PhD', department: 'Department of Computer Science', session2023: false, supportedShifts: ['Morning'] },
    ],
  },
  {
    name: 'Department of Electrical Engineering & Technology',
    code: 'EE',
    programs: [
      { name: 'B.Sc. Electrical Engineering', degreeLevel: 'BS Engineering', department: 'Department of Electrical Engineering & Technology', session2023: true, supportedShifts: ['Morning', 'Evening'] },
      { name: 'B.Sc. Electrical Engineering Technology', degreeLevel: 'BS Engineering Technology', department: 'Department of Electrical Engineering & Technology', session2023: false, supportedShifts: ['Morning', 'Evening'] },
      { name: 'MS Electrical Engineering', degreeLevel: 'MS', department: 'Department of Electrical Engineering & Technology', session2023: false, supportedShifts: ['Evening'] },
      { name: 'PhD Electrical Engineering', degreeLevel: 'PhD', department: 'Department of Electrical Engineering & Technology', session2023: false, supportedShifts: ['Evening'] },
    ],
  },
  {
    name: 'Department of Mechanical Engineering & Technology',
    code: 'ME',
    programs: [
      { name: 'B.Sc. Mechanical Engineering', degreeLevel: 'BS Engineering', department: 'Department of Mechanical Engineering & Technology', session2023: true, supportedShifts: ['Morning', 'Evening'] },
      { name: 'B.Sc. Mechanical Engineering Technology', degreeLevel: 'BS Engineering Technology', department: 'Department of Mechanical Engineering & Technology', session2023: false, supportedShifts: ['Morning', 'Evening'] },
      { name: 'MS Mechanical Engineering', degreeLevel: 'MS', department: 'Department of Mechanical Engineering & Technology', session2023: false, supportedShifts: ['Evening'] },
    ],
  },
  {
    name: 'Department of Civil Engineering & Technology',
    code: 'CE',
    programs: [
      { name: 'B.Sc. Civil Engineering', degreeLevel: 'BS Engineering', department: 'Department of Civil Engineering & Technology', session2023: true, supportedShifts: ['Morning', 'Evening'] },
      { name: 'B.Sc. Civil Engineering Technology', degreeLevel: 'BS Engineering Technology', department: 'Department of Civil Engineering & Technology', session2023: false, supportedShifts: ['Morning', 'Evening'] },
      { name: 'B.Sc. Architectural Engineering Technology', degreeLevel: 'BS Engineering Technology', department: 'Department of Civil Engineering & Technology', session2023: false, supportedShifts: ['Morning', 'Evening'] },
      { name: 'BS Building & Architectural Engineering', degreeLevel: 'BS Engineering', department: 'Department of Civil Engineering & Technology', session2023: false, supportedShifts: ['Morning', 'Evening'] },
      { name: 'MS Civil Engineering', degreeLevel: 'MS', department: 'Department of Civil Engineering & Technology', session2023: false, supportedShifts: ['Evening'] },
    ],
  },
  {
    name: 'Department of Chemical Engineering & Technology',
    code: 'CHE',
    programs: [
      { name: 'B.Sc. Chemical Engineering', degreeLevel: 'BS Engineering', department: 'Department of Chemical Engineering & Technology', session2023: true, supportedShifts: ['Morning', 'Evening'] },
      { name: 'B.Sc. Chemical Engineering Technology', degreeLevel: 'BS Engineering Technology', department: 'Department of Chemical Engineering & Technology', session2023: false, supportedShifts: ['Morning', 'Evening'] },
      { name: 'B.Sc. Food Engineering', degreeLevel: 'BS Engineering', department: 'Department of Chemical Engineering & Technology', session2023: false, supportedShifts: ['Morning', 'Evening'] },
      { name: 'MS Chemical Engineering', degreeLevel: 'MS', department: 'Department of Chemical Engineering & Technology', session2023: false, supportedShifts: ['Evening'] },
    ],
  },
  {
    name: 'Department of Management Sciences',
    code: 'MS',
    programs: [
      { name: 'BBA (Hons.)', degreeLevel: 'BBA', department: 'Department of Management Sciences', session2023: true, supportedShifts: ['Morning', 'Evening'] },
      { name: 'BS Digital Marketing & Artificial Intelligence', degreeLevel: 'BS', department: 'Department of Management Sciences', session2023: false, supportedShifts: ['Morning', 'Evening'] },
      { name: 'BS Business Analytics', degreeLevel: 'BS', department: 'Department of Management Sciences', session2023: false, supportedShifts: ['Morning', 'Evening'] },
      { name: 'BS Financial Technologies (FinTech)', degreeLevel: 'BS', department: 'Department of Management Sciences', session2023: false, supportedShifts: ['Morning', 'Evening'] },
      { name: 'BS Entrepreneurship', degreeLevel: 'BS', department: 'Department of Management Sciences', session2023: false, supportedShifts: ['Morning', 'Evening'] },
      { name: 'MBA', degreeLevel: 'MBA', department: 'Department of Management Sciences', session2023: false, supportedShifts: ['Evening', 'Morning'] },
      { name: 'MS Management Sciences', degreeLevel: 'MS', department: 'Department of Management Sciences', session2023: false, supportedShifts: ['Evening'] },
      { name: 'MS Project Management', degreeLevel: 'MS', department: 'Department of Management Sciences', session2023: false, supportedShifts: ['Evening'] },
    ],
  },
  {
    name: 'Department of Basic Sciences & Humanities',
    code: 'BSH',
    programs: [
      { name: 'BS Mathematics', degreeLevel: 'BS', department: 'Department of Basic Sciences & Humanities', session2023: true, supportedShifts: ['Morning', 'Evening'] },
      { name: 'BS Physics', degreeLevel: 'BS', department: 'Department of Basic Sciences & Humanities', session2023: false, supportedShifts: ['Morning', 'Evening'] },
      { name: 'BS Chemistry', degreeLevel: 'BS', department: 'Department of Basic Sciences & Humanities', session2023: false, supportedShifts: ['Morning', 'Evening'] },
      { name: 'BS Environmental Sciences', degreeLevel: 'BS', department: 'Department of Basic Sciences & Humanities', session2023: false, supportedShifts: ['Morning', 'Evening'] },
      { name: 'MS Mathematics', degreeLevel: 'MS', department: 'Department of Basic Sciences & Humanities', session2023: false, supportedShifts: ['Evening'] },
      { name: 'MS Physics', degreeLevel: 'MS', department: 'Department of Basic Sciences & Humanities', session2023: false, supportedShifts: ['Evening'] },
    ],
  },
];

export const DEGREE_LEVEL_OPTIONS = [
  'BS (4 Years)',
  'BS Engineering',
  'BS Engineering Technology',
  'B.Tech',
  'BBA (Hons.)',
  'MBA',
  'MS / M.Sc.',
  'PhD',
];

/**
 * The unique identity of each submitted status is:
 * Department + Program + Shift + Session + Semester
 * e.g. Computer Science + BS Computer Science + Morning + 2023 + 1
 * is strictly isolated from Computer Science + BS Computer Science + Evening + 2023 + 1.
 */
export function getRecordKey(
  department: string,
  program: string,
  degreeLevel?: string,
  shift: AcademicShift = 'Morning',
  session: string = '2023',
  semester: string = '1'
): string {
  const sanitize = (str: string) => (str || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `${sanitize(department)}__${sanitize(program)}__${sanitize(shift)}__${(session || '2023').trim()}__${(semester || '1').trim()}`;
}

export function getLegacyRecordKey(
  department: string,
  program: string,
  degreeLevel: string,
  shift: AcademicShift = 'Morning',
  session: string = '2023',
  semester: string = '1'
): string {
  const sanitize = (str: string) => (str || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `${sanitize(department)}__${sanitize(program)}__${sanitize(degreeLevel)}__${sanitize(shift)}__${(session || '2023').trim()}__${(semester || '1').trim()}`;
}

export function createEmptySubjectRow(
  index: number = 1,
  defaultShift: AcademicShift = 'Morning',
  semester: string = '1'
) {
  return {
    id: `row_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
    courseCode: '',
    subjectTitle: '',
    creditHours: '',
    sectionShift: `${defaultShift} - Sem ${semester}`,
    status: '' as const,
    dateUploaded: '',
    uploadedBy: '',
    remarks: '',
  };
}

export function createInitialBlankRows(
  count: number = 8,
  defaultShift: AcademicShift = 'Morning',
  semester: string = '1'
) {
  return Array.from({ length: count }, (_, i) => createEmptySubjectRow(i + 1, defaultShift, semester));
}

// Clean Database initialization: ZERO DUMMY DATA.
export const INITIAL_SEED_RECORDS: Record<string, SubmissionRecord> = {};

