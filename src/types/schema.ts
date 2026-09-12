/**
 * MNS-UET Central Academic Monitoring Portal - Database Schema Definitions
 * Perfectly designed, normalized, and extensible multi-module schemas
 * supporting LMS Result Upload Status and future institutional monitoring tasks.
 */

import { AcademicShift, LMSStatus, UserRole } from './index';

// -------------------------------------------------------------------------
// 1. BASE INSTITUTIONAL ENTITY (Shared by all monitoring tasks)
// -------------------------------------------------------------------------
export interface BaseInstitutionalEntity {
  id: string;
  department: string;
  program: string;
  degreeLevel: string; // e.g. "BS", "MS", "PhD"
  shift: AcademicShift; // "Morning" | "Evening"
  session: string; // e.g. "2023", "2024"
  semester: string; // "1" to "8"
  createdAt: string;
  updatedAt: string;
  accessedBy: string; // Name of logged-in user who modified
  userDesignation: string;
}

// -------------------------------------------------------------------------
// 2. TASK #1: LMS RESULT UPLOAD MONITORING SCHEMA
// -------------------------------------------------------------------------
export interface SubjectCourseRow {
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

export interface LMSResultRecord extends BaseInstitutionalEntity {
  moduleId: 'LMS';
  hodCoordinator: string;
  submissionDate: string;
  subjects: SubjectCourseRow[];
  referenceNumber?: string;
  editPin?: string;
  auditTrail?: AuditLogEntry[];
}

// -------------------------------------------------------------------------
// 3. TASK #2: FACULTY ATTENDANCE & CONDUCT MONITORING SCHEMA (In Progress)
// -------------------------------------------------------------------------
export interface FacultyLectureEntry {
  id: string;
  teacherId: string;
  teacherName: string;
  designation: string;
  courseCode: string;
  scheduledTime: string;
  punchInTime?: string;
  conductStatus: 'Delivered' | 'Substitute' | 'Cancelled' | 'Pending';
  remarks?: string;
}

export interface FacultyAttendanceRecord extends BaseInstitutionalEntity {
  moduleId: 'FACULTY_ATTENDANCE';
  targetDate: string;
  lectures: FacultyLectureEntry[];
  totalScheduled: number;
  totalDelivered: number;
  biometricComplianceRate: number;
}

// -------------------------------------------------------------------------
// 4. TASK #3: STUDENT ENROLLMENT & 75% ATTENDANCE SCHEMA (In Progress)
// -------------------------------------------------------------------------
export interface StudentAttendanceEntry {
  rollNumber: string;
  studentName: string;
  classesHeld: number;
  classesAttended: number;
  percentage: number;
  isEligible: boolean; // >= 75%
  warningIssued: boolean;
}

export interface StudentAttendanceRecord extends BaseInstitutionalEntity {
  moduleId: 'STUDENT_ATTENDANCE';
  courseCode: string;
  courseTitle: string;
  students: StudentAttendanceEntry[];
  totalEnrolled: number;
  eligibleCount: number;
  defaultersCount: number;
}

// -------------------------------------------------------------------------
// 5. TASK #4: COURSE FILE & OBE ACCREDITATION SCHEMA (In Progress)
// -------------------------------------------------------------------------
export interface CourseFileSectionStatus {
  sectionName: string; // e.g. "CLO-PLO Matrix", "Graded Samples", "CQI Action"
  isCompleted: boolean;
  auditedBy?: string;
  auditDate?: string;
  remarks?: string;
}

export interface CourseFileRecord extends BaseInstitutionalEntity {
  moduleId: 'COURSE_FILE';
  courseCode: string;
  instructorName: string;
  sections: CourseFileSectionStatus[];
  cloAttainmentRate: number;
  isPecCompliant: boolean;
}

// -------------------------------------------------------------------------
// 6. TASK #5: QEC INSTITUTIONAL AUDIT SCHEMA (In Progress)
// -------------------------------------------------------------------------
export interface QECAuditRecord extends BaseInstitutionalEntity {
  moduleId: 'QEC_AUDIT';
  sarSubmitted: boolean;
  sarSubmissionDate?: string;
  studentEvaluationAverage: number; // Scale 1 - 5
  facultyCourseReviewSubmitted: boolean;
  hecIpeRatingScore: number;
}

// -------------------------------------------------------------------------
// 7. TASK #6: EXAM SECRECY & PAPER MODERATION SCHEMA (In Progress)
// -------------------------------------------------------------------------
export interface ExamSecrecyRecord extends BaseInstitutionalEntity {
  moduleId: 'EXAM_SECRECY';
  examType: 'Midterm' | 'Final';
  paperModerated: boolean;
  moderatedBy?: string;
  scriptDeliveryDate?: string;
  marksSubmittedDate?: string;
  turnaroundDays: number;
  isDelayed: boolean;
}

// -------------------------------------------------------------------------
// 8. USER ACCOUNTS, AUTHENTICATION & SECURITY SCHEMA
// -------------------------------------------------------------------------
export interface UserAccountSchema {
  id: string;
  username: string;
  email: string; // Registered university/official email
  password: string; // Hashed/secured
  name: string;
  department: string;
  designation: string;
  role: UserRole;
  program?: string;
  createdAt: string;
  lastLoginAt?: string;
  failedLoginAttempts: number;
  isLocked: boolean;
  lockoutUntil?: string; // ISO string if account locked
  avatarUrl?: string;
  themePreference?: 'light' | 'dark';
}

// -------------------------------------------------------------------------
// 9. PASSWORD RESET SECURITY SCHEMA
// -------------------------------------------------------------------------
export interface PasswordResetRequest {
  id: string;
  accountId: string;
  username: string;
  email: string;
  otpCode: string; // 6-digit numeric verification code
  resetToken: string; // Cryptographically secure token
  expiresAt: string; // 15-minute expiration
  verified: boolean;
  attempts: number; // Max 5 verification attempts
  createdAt: string;
}

// -------------------------------------------------------------------------
// 10. SECURITY AUDIT EVENT SCHEMA (Anti-Hacking & Intrusion Detection)
// -------------------------------------------------------------------------
export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'ACCOUNT_LOCKED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_VERIFIED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT'
  | 'DATA_SANITY_VIOLATION'
  | 'BRUTE_FORCE_THROTTLED'
  | 'ADMIN_SECURITY_OVERRIDE';

export interface SecurityEventLog {
  id: string;
  type: SecurityEventType;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  actor: string;
  targetAccount?: string;
  ipAddress?: string;
  details: string;
  timestamp: string;
}

// -------------------------------------------------------------------------
// 11. AUDIT & ACCESS LOG SCHEMAS
// -------------------------------------------------------------------------
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: 'Created' | 'Updated' | 'Unlocked';
  actorName: string;
  actorDesignation?: string;
  summary: string;
  changes?: {
    courseCode: string;
    courseTitle?: string;
    field: string;
    oldValue: string;
    newValue: string;
  }[];
}
