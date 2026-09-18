import { FirebaseStore } from '../lib/firebaseStore';

export interface AuditTrailRecord {
  id: string;
  timestamp: string;
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'APPROVED' | 'REASSIGNED' | 'LOCKED' | 'SELECTION_SHIFT';
  actorId?: string;
  actorName: string;
  actorRole: string;
  department: string;
  program: string;
  shift?: string;
  semester?: string;
  section?: string;
  summary: string;
  details?: {
    field?: string;
    oldValue?: string;
    newValue?: string;
    courseCode?: string;
  }[];
}

const AUDIT_KEY = 'mnsuet_audit_trail_records_v99';

const SEED_AUDIT_LOGS: AuditTrailRecord[] = [
  {
    id: 'audit_seed_101',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    action: 'APPROVED',
    actorName: 'Dr. Muhammad Tariq',
    actorRole: 'Head of Department (HOD)',
    department: 'Department of Electrical Engineering & Technology',
    program: 'B.Sc. Electrical Engineering',
    shift: 'Morning',
    semester: '1',
    section: 'A',
    summary: 'HOD verified and approved Semester 1 (Section A) result sheet submission into LMS.',
  },
  {
    id: 'audit_seed_102',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    action: 'UPDATED',
    actorName: 'Engr. M. Arslan Qasim',
    actorRole: 'Program Coordinator',
    department: 'Department of Mechanical Engineering & Technology',
    program: 'B.Sc. Mechanical Engineering',
    shift: 'Morning',
    semester: '1',
    section: 'A',
    summary: 'Uploaded course MET-101 Technical Drawing final grade sheet and synchronized with LMS.',
  },
  {
    id: 'audit_seed_103',
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    action: 'REASSIGNED',
    actorName: 'Prof. Dr. Kamran',
    actorRole: 'Vice Chancellor',
    department: 'Department of Computer Science & Information Technology',
    program: 'B.Sc. Computer Science',
    shift: 'Evening',
    semester: '3',
    section: 'B',
    summary: 'Reassigned Program Coordinator role to Dr. Usman Ali for Evening Shift Session 2023.',
  },
  {
    id: 'audit_seed_104',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    action: 'CREATED',
    actorName: 'Engr. Saad Ahmad',
    actorRole: 'Course Instructor',
    department: 'Department of Civil Engineering & Technology',
    program: 'B.Sc. Civil Engineering',
    shift: 'Morning',
    semester: '2',
    section: 'A',
    summary: 'Created new result entry for Surveying-I (CVE-102) and attached mid & final assessment marks.',
  },
  {
    id: 'audit_seed_105',
    timestamp: new Date(Date.now() - 3600000 * 36).toISOString(),
    action: 'UPDATED',
    actorName: 'Dr. Shahbaz',
    actorRole: 'Head of Department (HOD)',
    department: 'Department of Chemical Engineering & Technology',
    program: 'B.Sc. Chemical Engineering',
    shift: 'Morning',
    semester: '1',
    section: 'A',
    summary: 'Updated delay justification remarks for Fluid Mechanics result tabulations.',
  },
];

export class AuditTrailService {
  private static isInitialized = false;

  public static init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Seed logs if empty
    this.getLogs();

    // Listen to Firebase audit logs
    FirebaseStore.listenGlobalState(AUDIT_KEY, (data) => {
      if (data) {
        const current = localStorage.getItem(AUDIT_KEY);
        const newStr = typeof data === 'string' ? data : JSON.stringify(data);
        if (current !== newStr) {
          localStorage.setItem(AUDIT_KEY, newStr);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mnsuet_audit_updated'));
          }
        }
      }
    });
  }

  public static getLogs(): AuditTrailRecord[] {
    try {
      const stored = localStorage.getItem(AUDIT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}

    // Populate seed audit logs if empty
    try {
      localStorage.setItem(AUDIT_KEY, JSON.stringify(SEED_AUDIT_LOGS));
      FirebaseStore.syncGlobalState(AUDIT_KEY, SEED_AUDIT_LOGS).catch(console.error);
    } catch (e) {}

    return SEED_AUDIT_LOGS;
  }

  public static logChange(entry: {
    action: AuditTrailRecord['action'];
    actorId?: string;
    actorName: string;
    actorRole: string;
    department: string;
    program: string;
    shift?: string;
    semester?: string;
    section?: string;
    summary: string;
    details?: AuditTrailRecord['details'];
  }): AuditTrailRecord {
    const record: AuditTrailRecord = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };

    const logs = this.getLogs();
    const updated = [record, ...logs].slice(0, 500); // Keep last 500 records

    localStorage.setItem(AUDIT_KEY, JSON.stringify(updated));

    try {
      FirebaseStore.syncGlobalState(AUDIT_KEY, updated).catch(console.error);
    } catch (e) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mnsuet_audit_updated'));
    }

    return record;
  }

  public static getLogsForProgram(
    department: string,
    program: string,
    shift?: string
  ): AuditTrailRecord[] {
    const logs = this.getLogs();
    const normDept = (department || '').trim().toLowerCase();
    const normProg = (program || '').trim().toLowerCase();
    const normShift = (shift || '').trim().toLowerCase();

    return logs.filter((log) => {
      const matchDept = !normDept || log.department.trim().toLowerCase().includes(normDept) || normDept.includes(log.department.trim().toLowerCase());
      const matchProg = !normProg || log.program.trim().toLowerCase().includes(normProg) || normProg.includes(log.program.trim().toLowerCase());
      const matchShift = !normShift || !log.shift || log.shift.trim().toLowerCase() === normShift;
      return matchDept && matchProg && matchShift;
    });
  }

  public static exportCSV(): void {
    const logs = this.getLogs();
    if (logs.length === 0) return;

    const headers = ['ID', 'Timestamp', 'Action', 'Actor Name', 'Role', 'Department', 'Program', 'Shift', 'Semester', 'Section', 'Summary'];
    const rows = logs.map((l) => [
      l.id,
      new Date(l.timestamp).toLocaleString(),
      l.action,
      `"${(l.actorName || '').replace(/"/g, '""')}"`,
      l.actorRole,
      `"${(l.department || '').replace(/"/g, '""')}"`,
      `"${(l.program || '').replace(/"/g, '""')}"`,
      l.shift || '',
      l.semester || '',
      l.section || '',
      `"${(l.summary || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MNS_UET_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Auto init
AuditTrailService.init();
