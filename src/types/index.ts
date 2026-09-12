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

export type UserRole =
  | 'ADMIN'
  | 'VC'
  | 'HOD'
  | 'COORDINATOR'
  | 'LECTURER'
  | 'VISITING_LECTURER';

export interface UserAccount {
  id: string;
  username: string; // e.g. "admin", "VC", "hod_cs", or "coordinator"
  email?: string; // registered email for account recovery and notifications
  password: string; // plain text / hash for demo persistence
  name: string;
  department: string; // e.g. "Department of Computer Science" or "ALL"
  designation: string;
  role: UserRole;
  program?: string; // e.g. "BS Artificial Intelligence"
  createdAt: string;
  lastLoginAt?: string;
  failedLoginAttempts?: number;
  isLocked?: boolean;
  lockoutUntil?: string;
  avatarUrl?: string; // base64 or photo URL
  themePreference?: 'light' | 'dark';
}

export interface ActiveUserSession {
  id: string;
  username: string;
  email?: string;
  name: string;
  designation: string;
  department: string;
  role: UserRole;
  program?: string; // e.g. "BS Artificial Intelligence"
  token?: string;
  avatarUrl?: string;
  themePreference?: 'light' | 'dark';
}

export interface AuditChangeDetail {
  courseCode: string;
  courseTitle?: string;
  field: string;
  oldValue: string;
  newValue: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: 'Created' | 'Updated' | 'Unlocked';
  actorName: string;
  actorDesignation?: string;
  summary: string;
  changes?: AuditChangeDetail[];
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

  // Security credentials (No Login + Reference Number + Edit PIN)
  referenceNumber?: string; // e.g. "MNSUET-CS-BSCS-S1-M-7F4K92"
  editPin?: string; // e.g. "58392174"
  auditTrail?: AuditLogEntry[];
}

export interface ExecutiveSummary {
  totalSubjects: number;
  uploaded: number;
  pending: number;
  inProgress: number;
  notApplicable: number;
  uploadPercentage: number;
}

export type MonitoringModuleId = 'LMS' | 'WORK_ON_DEMAND';

export interface WorkOnDemandRequisition {
  id: string; // e.g. "REQ-MNSUET-2024-001"
  moduleName: string;
  category: 'Faculty Oversight' | 'Student Affairs' | 'OBE & Accreditation' | 'Quality Enhancement' | 'Examinations' | 'Other';
  requestedBy: string; // e.g. "Vice Chancellor Secretariat"
  requestorRole: string;
  department?: string;
  targetSession: string;
  priority: 'High (Immediate Session)' | 'Medium (Next Academic Year)' | 'Standard';
  status: 'Approved by VC' | 'Under Technical Review' | 'Scheduled for Integration';
  submittedAt: string;
  technicalRequirements: string;
  hardwareOrApiNeeded: string;
}

export * from './schema';


