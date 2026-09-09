export type LMSStatus = 'Uploaded' | 'Pending' | 'In Progress' | 'Not Applicable' | '';

export type AcademicShift = 'Morning' | 'Evening';

export interface SubjectRow {
  id: string;
  courseCode: string;
  subjectTitle: string;
  creditHours: string;
  sectionShift: string;
  status: LMSStatus;
  dateUploaded: string;
  uploadedBy: string;
  remarks: string;
}

export interface ProgramInfo {
  name: string;
  degreeLevel: string;
  department: string;
  session2023: boolean; // Indicates if this program has an active batch in Session 2023
  supportedShifts?: AcademicShift[];
}

export interface AccessLogEntry {
  id: string;
  userName: string;
  designation: string;
  department: string;
  action: string;
  program?: string;
  shift?: AcademicShift;
  timestamp: string;
}

export interface ActiveUserSession {
  name: string;
  designation: string;
  department: string;
}

export interface SubmissionRecord {
  id: string; // key: department__program__degreeLevel__shift__session__semester
  department: string;
  program: string;
  degreeLevel: string;
  shift: AcademicShift; // 'Morning' | 'Evening'
  session: string; // e.g. "2023", "2024"
  semester: string; // e.g. "1"
  hodCoordinator: string;
  submissionDate: string;
  subjects: SubjectRow[];
  accessedBy: string; // Traceability: Name of HOD / Coordinator who saved/modified
  userDesignation?: string;
  updatedAt: string;
  createdAt: string;
}

export interface ExecutiveSummary {
  totalSubjects: number;
  uploaded: number;
  pending: number;
  inProgress: number;
  notApplicable: number;
  uploadPercentage: number;
}
