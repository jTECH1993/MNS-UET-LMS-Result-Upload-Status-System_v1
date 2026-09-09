import {
  SubmissionRecord,
  SubjectRow,
  ExecutiveSummary,
  ActiveUserSession,
  AccessLogEntry,
  AcademicShift,
} from '../types';
import {
  UNIVERSITY_DEPARTMENTS,
  INITIAL_SEED_RECORDS,
  DEFAULT_ACADEMIC_SESSIONS,
  getRecordKey,
} from '../data/departmentsData';

const STORAGE_KEY = 'mnsuet_lms_result_records_v3';
const USER_KEY = 'mnsuet_lms_active_user_v2';
const ACCESS_LOG_KEY = 'mnsuet_lms_access_logs_v2';
const SESSION_ROSTER_KEY = 'mnsuet_session_active_roster_v4';
const AVAILABLE_SESSIONS_KEY = 'mnsuet_available_sessions_v1';
const CURRENT_SESSION_KEY = 'mnsuet_current_active_session_v1';

export class StorageService {
  // Generic Academic Sessions Management (e.g. 2023, 2024, 2025, or custom added)
  public static getAvailableSessions(): string[] {
    try {
      const stored = localStorage.getItem(AVAILABLE_SESSIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read available sessions', e);
    }
    return DEFAULT_ACADEMIC_SESSIONS;
  }

  public static addAcademicSession(newSession: string): string[] {
    const trimmed = newSession.trim();
    if (!trimmed) return this.getAvailableSessions();
    const current = this.getAvailableSessions();
    if (!current.includes(trimmed)) {
      const updated = [trimmed, ...current];
      try {
        localStorage.setItem(AVAILABLE_SESSIONS_KEY, JSON.stringify(updated));
        this.logAccess(`Added new academic session: Session ${trimmed}`);
      } catch (e) {
        console.error('Could not save new academic session', e);
      }
      return updated;
    }
    return current;
  }

  public static getSelectedSession(): string {
    try {
      const stored = localStorage.getItem(CURRENT_SESSION_KEY);
      if (stored && stored.trim()) return stored.trim();
    } catch (e) {
      // fallback
    }
    return '2023';
  }

  public static setSelectedSession(session: string): void {
    try {
      localStorage.setItem(CURRENT_SESSION_KEY, session);
      this.logAccess(`Switched active academic session to Session ${session}`);
    } catch (e) {
      console.error('Could not save selected session', e);
    }
  }

  // Session Enrolled Programs Management (Generic per session or department)
  public static getSessionPrograms(departmentName: string, sessionName: string = '2023'): string[] {
    try {
      const stored = localStorage.getItem(`${SESSION_ROSTER_KEY}__${sessionName}`);
      if (stored) {
        const roster: Record<string, string[]> = JSON.parse(stored);
        if (roster[departmentName] && Array.isArray(roster[departmentName])) {
          return roster[departmentName];
        }
      }
    } catch (e) {
      console.warn('Could not read session roster', e);
    }
    const dept = UNIVERSITY_DEPARTMENTS.find((d) => d.name === departmentName);
    if (!dept) return [];
    // Default fallback: if 2023, return session2023 flag; else return all department programs
    if (sessionName === '2023') {
      return dept.programs.filter((p) => p.session2023).map((p) => p.name);
    }
    return dept.programs.map((p) => p.name);
  }

  // Backward compatibility alias
  public static getSession2023Programs(departmentName: string): string[] {
    return this.getSessionPrograms(departmentName, '2023');
  }

  public static getAllSessionRoster(sessionName: string = '2023'): Record<string, string[]> {
    try {
      const stored = localStorage.getItem(`${SESSION_ROSTER_KEY}__${sessionName}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      // fallback
    }
    const defaultRoster: Record<string, string[]> = {};
    UNIVERSITY_DEPARTMENTS.forEach((dept) => {
      defaultRoster[dept.name] =
        sessionName === '2023'
          ? dept.programs.filter((p) => p.session2023).map((p) => p.name)
          : dept.programs.map((p) => p.name);
    });
    return defaultRoster;
  }

  public static getAllSession2023Roster(): Record<string, string[]> {
    return this.getAllSessionRoster('2023');
  }

  public static setSessionPrograms(departmentName: string, programNames: string[], sessionName: string = '2023'): void {
    try {
      const currentRoster = this.getAllSessionRoster(sessionName);
      currentRoster[departmentName] = programNames;
      localStorage.setItem(`${SESSION_ROSTER_KEY}__${sessionName}`, JSON.stringify(currentRoster));
      this.logAccess(
        `Configured Session ${sessionName} programs for ${departmentName} (${programNames.length} selected)`,
        departmentName
      );
    } catch (e) {
      console.error('Could not save session roster', e);
    }
  }

  public static setSession2023Programs(departmentName: string, programNames: string[]): void {
    this.setSessionPrograms(departmentName, programNames, '2023');
  }

  public static resetSession2023Roster(): void {
    try {
      localStorage.removeItem(`${SESSION_ROSTER_KEY}__2023`);
      this.logAccess('Reset Session 2023 program roster to defaults');
    } catch (e) {
      console.error('Could not reset session roster', e);
    }
  }

  private static getStore(): Record<string, SubmissionRecord> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Clean start: ZERO dummy records
        localStorage.setItem(STORAGE_KEY, JSON.stringify({}));
        return {};
      }
      return JSON.parse(stored);
    } catch (e) {
      console.warn('Could not read from localStorage, using clean store', e);
      return {};
    }
  }

  private static setStore(data: Record<string, SubmissionRecord>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Could not save to localStorage', e);
    }
  }

  // Active User / Access Traceability Management (No passwords required)
  public static getActiveUser(): ActiveUserSession {
    try {
      const stored = localStorage.getItem(USER_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      // fallback
    }
    return {
      name: 'Dr. HOD / Coordinator',
      designation: 'HOD / Program Coordinator',
      department: 'Department of Computer Science',
    };
  }

  public static setActiveUser(user: ActiveUserSession): void {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      this.logAccess(`User identification set: ${user.name} (${user.designation})`, user.department);
    } catch (e) {
      console.error('Could not set active user', e);
    }
  }

  // Access Logs for database audit trail
  public static getAccessLogs(): AccessLogEntry[] {
    try {
      const stored = localStorage.getItem(ACCESS_LOG_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      // fallback
    }
    return [];
  }

  public static logAccess(action: string, department?: string, program?: string): void {
    try {
      const currentUser = this.getActiveUser();
      const logs = this.getAccessLogs();
      const newEntry: AccessLogEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userName: currentUser.name || 'Anonymous Faculty',
        designation: currentUser.designation || 'Faculty Member',
        department: department || currentUser.department || 'MNS-UET Multan',
        action,
        program,
        timestamp: new Date().toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
      };
      const updated = [newEntry, ...logs].slice(0, 50); // keep recent 50
      localStorage.setItem(ACCESS_LOG_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Could not record access log', e);
    }
  }

  public static getSubmission(
    department: string,
    program: string,
    degreeLevel: string,
    shift: AcademicShift = 'Morning',
    session: string = '2023',
    semester: string = '1'
  ): SubmissionRecord | null {
    const key = getRecordKey(department, program, degreeLevel, shift, session, semester);
    const store = this.getStore();
    return store[key] || null;
  }

  public static saveSubmission(record: SubmissionRecord): { success: boolean; isUpdate: boolean } {
    const store = this.getStore();
    const key =
      record.id ||
      getRecordKey(
        record.department,
        record.program,
        record.degreeLevel,
        record.shift || 'Morning',
        record.session,
        record.semester
      );
    const isUpdate = Boolean(store[key]);
    const activeUser = this.getActiveUser();

    const recordToSave: SubmissionRecord = {
      ...record,
      id: key,
      shift: record.shift || 'Morning',
      accessedBy: activeUser.name || record.accessedBy || 'University HOD',
      userDesignation: activeUser.designation || record.userDesignation || 'HOD / Coordinator',
      updatedAt: new Date().toISOString(),
      createdAt: isUpdate
        ? store[key].createdAt || new Date().toISOString()
        : new Date().toISOString(),
    };

    store[key] = recordToSave;
    this.setStore(store);

    // Audit log
    this.logAccess(
      isUpdate
        ? `Updated result upload status for ${record.program} [${record.shift}] (${record.subjects.length} courses)`
        : `Submitted new LMS record for ${record.program} [${record.shift}] (${record.subjects.length} courses)`,
      record.department,
      record.program
    );

    return { success: true, isUpdate };
  }

  public static deleteSubmission(
    department: string,
    program: string,
    degreeLevel: string,
    shift: AcademicShift = 'Morning',
    session: string = '2023',
    semester: string = '1'
  ): boolean {
    const key = getRecordKey(department, program, degreeLevel, shift, session, semester);
    const store = this.getStore();
    if (store[key]) {
      delete store[key];
      this.setStore(store);
      this.logAccess(`Permanently deleted LMS record for ${program} [${shift}]`, department, program);
      return true;
    }
    return false;
  }

  public static getAllSubmissions(): SubmissionRecord[] {
    const store = this.getStore();
    return Object.values(store);
  }

  // Clear all data to ensure 100% clean database
  public static clearAllData(): void {
    this.setStore({});
    this.logAccess('Purged database to clean state (zero records)');
  }

  // Calculate executive summary based on subjects entered (blank rows excluded!)
  public static calculateSummary(subjects: SubjectRow[]): ExecutiveSummary {
    const activeSubjects = subjects.filter((row) => {
      const hasCode = row.courseCode && row.courseCode.trim().length > 0;
      const hasTitle = row.subjectTitle && row.subjectTitle.trim().length > 0;
      const hasStatus = row.status && row.status.trim().length > 0;
      return hasCode || hasTitle || hasStatus;
    });

    const total = activeSubjects.length;
    let uploaded = 0;
    let pending = 0;
    let inProgress = 0;
    let notApplicable = 0;

    activeSubjects.forEach((row) => {
      if (row.status === 'Uploaded') uploaded++;
      else if (row.status === 'Pending') pending++;
      else if (row.status === 'In Progress') inProgress++;
      else if (row.status === 'Not Applicable') notApplicable++;
    });

    const uploadPercentage = total > 0 ? Math.round((uploaded / total) * 100) : 0;

    return {
      totalSubjects: total,
      uploaded,
      pending,
      inProgress,
      notApplicable,
      uploadPercentage,
    };
  }

  // Export university master records to CSV (or custom records)
  public static exportCSV(customRecords?: SubmissionRecord[], filename?: string): void {
    const records = customRecords || this.getAllSubmissions();
    if (records.length === 0) {
      alert('No records found to export. Please enter and save at least one program.');
      return;
    }

    const headers = [
      'Department',
      'Program',
      'Degree Level',
      'Shift',
      'Session',
      'Semester',
      'HOD / Coordinator',
      'Logged By (Traceability)',
      'Designation',
      'Submission Date',
      'Course #',
      'Course Code',
      'Course Title',
      'Credit Hours',
      'Section / Shift',
      'LMS Status',
      'Date Uploaded',
      'Uploaded By',
      'Remarks',
    ];

    const rows: string[][] = [];

    records.forEach((rec) => {
      const activeSubjects = rec.subjects.filter(
        (s) => s.courseCode.trim() || s.subjectTitle.trim() || s.status
      );

      if (activeSubjects.length === 0) {
        rows.push([
          `"${rec.department}"`,
          `"${rec.program}"`,
          `"${rec.degreeLevel}"`,
          `"${rec.shift || 'Morning'}"`,
          `"${rec.session}"`,
          `"${rec.semester}"`,
          `"${rec.hodCoordinator}"`,
          `"${rec.accessedBy || ''}"`,
          `"${rec.userDesignation || ''}"`,
          `"${rec.submissionDate}"`,
          '-',
          '-',
          '-',
          '-',
          '-',
          'No courses entered',
          '-',
          '-',
          '-',
        ]);
      } else {
        activeSubjects.forEach((sub, idx) => {
          rows.push([
            `"${rec.department}"`,
            `"${rec.program}"`,
            `"${rec.degreeLevel}"`,
            `"${rec.shift || 'Morning'}"`,
            `"${rec.session}"`,
            `"${rec.semester}"`,
            `"${rec.hodCoordinator}"`,
            `"${rec.accessedBy || ''}"`,
            `"${rec.userDesignation || ''}"`,
            `"${rec.submissionDate}"`,
            String(idx + 1),
            `"${sub.courseCode}"`,
            `"${sub.subjectTitle}"`,
            `"${sub.creditHours}"`,
            `"${sub.sectionShift || rec.shift}"`,
            `"${sub.status}"`,
            `"${sub.dateUploaded}"`,
            `"${sub.uploadedBy}"`,
            `"${sub.remarks}"`,
          ]);
        });
      }
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `MNS_UET_LMS_Session_2023_Semester_1_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
