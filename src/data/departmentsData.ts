import { ProgramInfo, SubmissionRecord } from '../types';

export interface DepartmentGroup {
  name: string;
  code: string;
  programs: ProgramInfo[];
}

// Official Departments and Academic Programs from MNS-UET Multan (https://mnsuet.edu.pk/)
// Official Departments and Academic Programs from MNS-UET Multan (https://mnsuet.edu.pk/)
// In Session 2023, only genuine enrolled programs (e.g. 2 programs in CS) are marked active by default.
// HODs can also customize/toggle their department's Session 2023 active programs in the UI.
export const UNIVERSITY_DEPARTMENTS: DepartmentGroup[] = [
  {
    name: 'Department of Computer Science',
    code: 'CS',
    programs: [
      { name: 'BS Computer Science', degreeLevel: 'BS', department: 'Department of Computer Science', session2023: true },
      { name: 'B.Sc. Software Engineering Technology (B.Tech)', degreeLevel: 'B.Tech', department: 'Department of Computer Science', session2023: true },
      { name: 'BS Software Engineering', degreeLevel: 'BS', department: 'Department of Computer Science', session2023: false },
      { name: 'BS Artificial Intelligence', degreeLevel: 'BS', department: 'Department of Computer Science', session2023: false },
      { name: 'BS Cyber Security', degreeLevel: 'BS', department: 'Department of Computer Science', session2023: false },
      { name: 'BS Data Science', degreeLevel: 'BS', department: 'Department of Computer Science', session2023: false },
      { name: 'BS Information Technology', degreeLevel: 'BS', department: 'Department of Computer Science', session2023: false },
      { name: 'BS Internet of Things (IoT)', degreeLevel: 'BS', department: 'Department of Computer Science', session2023: false },
      { name: 'MS Computer Science', degreeLevel: 'MS', department: 'Department of Computer Science', session2023: false },
      { name: 'PhD Computer Science', degreeLevel: 'PhD', department: 'Department of Computer Science', session2023: false },
    ],
  },
  {
    name: 'Department of Electrical Engineering & Technology',
    code: 'EE',
    programs: [
      { name: 'B.Sc. Electrical Engineering', degreeLevel: 'BS Engineering', department: 'Department of Electrical Engineering & Technology', session2023: true },
      { name: 'B.Sc. Electrical Engineering Technology', degreeLevel: 'BS Engineering Technology', department: 'Department of Electrical Engineering & Technology', session2023: false },
      { name: 'MS Electrical Engineering', degreeLevel: 'MS', department: 'Department of Electrical Engineering & Technology', session2023: false },
      { name: 'PhD Electrical Engineering', degreeLevel: 'PhD', department: 'Department of Electrical Engineering & Technology', session2023: false },
    ],
  },
  {
    name: 'Department of Mechanical Engineering & Technology',
    code: 'ME',
    programs: [
      { name: 'B.Sc. Mechanical Engineering', degreeLevel: 'BS Engineering', department: 'Department of Mechanical Engineering & Technology', session2023: true },
      { name: 'B.Sc. Mechanical Engineering Technology', degreeLevel: 'BS Engineering Technology', department: 'Department of Mechanical Engineering & Technology', session2023: false },
      { name: 'MS Mechanical Engineering', degreeLevel: 'MS', department: 'Department of Mechanical Engineering & Technology', session2023: false },
    ],
  },
  {
    name: 'Department of Civil Engineering & Technology',
    code: 'CE',
    programs: [
      { name: 'B.Sc. Civil Engineering', degreeLevel: 'BS Engineering', department: 'Department of Civil Engineering & Technology', session2023: true },
      { name: 'B.Sc. Civil Engineering Technology', degreeLevel: 'BS Engineering Technology', department: 'Department of Civil Engineering & Technology', session2023: false },
      { name: 'B.Sc. Architectural Engineering Technology', degreeLevel: 'BS Engineering Technology', department: 'Department of Civil Engineering & Technology', session2023: false },
      { name: 'BS Building & Architectural Engineering', degreeLevel: 'BS Engineering', department: 'Department of Civil Engineering & Technology', session2023: false },
      { name: 'MS Civil Engineering', degreeLevel: 'MS', department: 'Department of Civil Engineering & Technology', session2023: false },
    ],
  },
  {
    name: 'Department of Chemical Engineering & Technology',
    code: 'CHE',
    programs: [
      { name: 'B.Sc. Chemical Engineering', degreeLevel: 'BS Engineering', department: 'Department of Chemical Engineering & Technology', session2023: true },
      { name: 'B.Sc. Chemical Engineering Technology', degreeLevel: 'BS Engineering Technology', department: 'Department of Chemical Engineering & Technology', session2023: false },
      { name: 'B.Sc. Food Engineering', degreeLevel: 'BS Engineering', department: 'Department of Chemical Engineering & Technology', session2023: false },
      { name: 'MS Chemical Engineering', degreeLevel: 'MS', department: 'Department of Chemical Engineering & Technology', session2023: false },
    ],
  },
  {
    name: 'Department of Management Sciences',
    code: 'MS',
    programs: [
      { name: 'BBA (Hons.)', degreeLevel: 'BBA', department: 'Department of Management Sciences', session2023: true },
      { name: 'BS Digital Marketing & Artificial Intelligence', degreeLevel: 'BS', department: 'Department of Management Sciences', session2023: false },
      { name: 'BS Business Analytics', degreeLevel: 'BS', department: 'Department of Management Sciences', session2023: false },
      { name: 'BS Financial Technologies (FinTech)', degreeLevel: 'BS', department: 'Department of Management Sciences', session2023: false },
      { name: 'BS Entrepreneurship', degreeLevel: 'BS', department: 'Department of Management Sciences', session2023: false },
      { name: 'MBA', degreeLevel: 'MBA', department: 'Department of Management Sciences', session2023: false },
      { name: 'MS Management Sciences', degreeLevel: 'MS', department: 'Department of Management Sciences', session2023: false },
      { name: 'MS Project Management', degreeLevel: 'MS', department: 'Department of Management Sciences', session2023: false },
    ],
  },
  {
    name: 'Department of Basic Sciences & Humanities',
    code: 'BSH',
    programs: [
      { name: 'BS Mathematics', degreeLevel: 'BS', department: 'Department of Basic Sciences & Humanities', session2023: true },
      { name: 'BS Physics', degreeLevel: 'BS', department: 'Department of Basic Sciences & Humanities', session2023: false },
      { name: 'BS Chemistry', degreeLevel: 'BS', department: 'Department of Basic Sciences & Humanities', session2023: false },
      { name: 'BS Environmental Sciences', degreeLevel: 'BS', department: 'Department of Basic Sciences & Humanities', session2023: false },
      { name: 'MS Mathematics', degreeLevel: 'MS', department: 'Department of Basic Sciences & Humanities', session2023: false },
      { name: 'MS Physics', degreeLevel: 'MS', department: 'Department of Basic Sciences & Humanities', session2023: false },
    ],
  },
];

export function getRecordKey(
  department: string,
  program: string,
  degreeLevel: string,
  session: string = '2023',
  semester: string = '1'
): string {
  const sanitize = (str: string) => str.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `${sanitize(department)}__${sanitize(program)}__${sanitize(degreeLevel)}__${session}__${semester}`;
}

export function createEmptySubjectRow(index: number = 1) {
  return {
    id: `row_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
    courseCode: '',
    subjectTitle: '',
    creditHours: '',
    sectionShift: '',
    status: '' as const,
    dateUploaded: '',
    uploadedBy: '',
    remarks: '',
  };
}

export function createInitialBlankRows(count: number = 1) {
  return Array.from({ length: count }, (_, i) => createEmptySubjectRow(i + 1));
}

// Clean Database initialization: ZERO DUMMY DATA.
// Only records entered and saved by the real university HODs will be stored.
export const INITIAL_SEED_RECORDS: Record<string, SubmissionRecord> = {};
