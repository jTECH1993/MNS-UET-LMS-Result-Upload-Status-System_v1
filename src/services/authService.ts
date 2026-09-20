import bcrypt from 'bcryptjs';
import { UserAccount, ActiveUserSession, UserRole, AppTheme, AcademicShift, ProgramAccessRequest } from '../types';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import { SecurityService } from './securityService';
import { FirebaseStore } from '../lib/firebaseStore';

export interface ThemeDefinition {
  id: AppTheme;
  name: string;
  category: 'day' | 'night' | 'special';
  badge: string;
  description: string;
  primaryPreview: string;
  accentPreview: string;
  bgPreview: string;
  isDark: boolean;
}

export const INSTITUTIONAL_THEMES: ThemeDefinition[] = [
  {
    id: 'emerald',
    name: 'Institutional Emerald',
    category: 'day',
    badge: 'Official Day Mode',
    description: 'Official MNS-UET green & slate daylight canvas with pristine readability.',
    primaryPreview: 'bg-emerald-700',
    accentPreview: 'bg-emerald-100 border-emerald-300',
    bgPreview: 'bg-slate-50',
    isDark: false,
  },
  {
    id: 'midnight',
    name: 'Executive Midnight',
    category: 'night',
    badge: 'Night Mode',
    description: 'Deep midnight slate canvas with luminous emerald highlights, tailored for night grading.',
    primaryPreview: 'bg-emerald-500',
    accentPreview: 'bg-slate-800 border-slate-700',
    bgPreview: 'bg-[#0b1320]',
    isDark: true,
  },
  {
    id: 'oxford',
    name: 'Oxford Academic Navy',
    category: 'special',
    badge: 'Executive Council',
    description: 'Prestigious collegiate royal navy & deep sapphire tones preferred by Deans & Council.',
    primaryPreview: 'bg-blue-800',
    accentPreview: 'bg-blue-50 border-blue-200',
    bgPreview: 'bg-slate-100',
    isDark: false,
  },
  {
    id: 'sunset',
    name: 'Sunset Scholar',
    category: 'day',
    badge: 'Warm Daylight',
    description: 'Warm stone & golden amber tones to reduce eye fatigue during long monitoring sessions.',
    primaryPreview: 'bg-amber-700',
    accentPreview: 'bg-amber-50 border-amber-200',
    bgPreview: 'bg-[#faf8f5]',
    isDark: false,
  },
  {
    id: 'contrast',
    name: 'Auditor High-Contrast',
    category: 'special',
    badge: 'Projector & Audit',
    description: 'Ultra-crisp monochrome with high-contrast borders for projector presentations & audits.',
    primaryPreview: 'bg-black',
    accentPreview: 'bg-white border-black',
    bgPreview: 'bg-white',
    isDark: false,
  },
];

export const SecurityHelper = {
  isHashed: (str: string): boolean => {
    if (!str || typeof str !== 'string') return false;
    return str.startsWith('$2a$') || str.startsWith('$2b$') || str.startsWith('$2y$');
  },
  verifyPassword: (input: string, stored: string): boolean => {
    if (!input || !stored) return false;
    try {
      if (SecurityHelper.isHashed(stored)) {
        return bcrypt.compareSync(input, stored);
      }
      return input === stored;
    } catch (e) {
      console.error('Password verification error', e);
      return input === stored;
    }
  },
  hashPassword: (input: string): string => {
    if (!input) return '';
    try {
      if (SecurityHelper.isHashed(input)) {
        return input;
      }
      return bcrypt.hashSync(input, 10);
    } catch (e) {
      console.error('Password hashing error', e);
      return input;
    }
  },
};

const ACCOUNTS_STORAGE_KEY = 'mnsuet_user_accounts_v99';
const ACTIVE_AUTH_SESSION_KEY = 'mnsuet_auth_session_v99';

// Seed default official university accounts (Master accounts: Admin, VC, & Coordinator)
export const DEFAULT_ACCOUNTS: UserAccount[] = [
  {
    id: 'user_admin',
    username: 'admin',
    email: 'admin@mnsuet.edu.pk',
    password: SecurityHelper.hashPassword('Qwe12!@!@'),
    name: 'System Administrator',
    designation: 'Director IT / Administrator',
    department: 'Office of the Registrar / IT Directorate',
    role: 'ADMIN',
    approvalStatus: 'APPROVED',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'user_vc',
    username: 'VC',
    email: 'vc@mnsuet.edu.pk',
    password: SecurityHelper.hashPassword('JHG45$%xz'),
    name: 'Prof. Dr. Vice Chancellor',
    designation: 'Vice Chancellor',
    department: 'Office of the Vice Chancellor',
    role: 'VC',
    approvalStatus: 'APPROVED',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'user_talha_coord',
    username: 'mtalhajahangir',
    email: 'mtalhajahangir@mnsuet.edu.pk',
    password: SecurityHelper.hashPassword('Qwe12!@!@'),
    name: 'Engr. Muhammad Talha Jahangir',
    designation: 'Program Coordinator (BS AI) / Lecturer',
    department: 'Department of Computer Science',
    role: 'COORDINATOR',
    program: 'BS Artificial Intelligence',
    assignedPrograms: ['BS Artificial Intelligence'],
    assignedShifts: ['Morning', 'Evening'],
    approvalStatus: 'APPROVED',
    approvedBy: 'Academic Directorate',
    approvedAt: '2026-09-01T08:00:00.000Z',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
];

export class AuthService {
  private static _isDatabaseSyncInitialized = false;

  // Initialize bi-directional synchronization with SQLite backend and Firestore cloud
  public static initDatabaseSync(): void {
    if (this._isDatabaseSyncInitialized) return;
    this._isDatabaseSyncInitialized = true;

    // 1. Listen to real-time changes in Firestore users collection
    try {
      FirebaseStore.listenToUserAccounts((cloudAccounts) => {
        if (!cloudAccounts) return;
        const localAccounts = this.getAccounts();
        let changed = false;

        const mergedMap = new Map<string, UserAccount>();
        // Initialize map with DEFAULT_ACCOUNTS to ensure master accounts are always preserved
        DEFAULT_ACCOUNTS.forEach((acc) => mergedMap.set(acc.id, acc));

        // Incorporate cloud accounts
        cloudAccounts.forEach((remoteAcc) => {
          mergedMap.set(remoteAcc.id, remoteAcc);
        });

        const newMergedList = Array.from(mergedMap.values());

        // Compare with local accounts to detect any creations, deletions or updates
        if (localAccounts.length !== newMergedList.length) {
          changed = true;
        } else {
          for (const localAcc of localAccounts) {
            const remoteAcc = mergedMap.get(localAcc.id);
            if (!remoteAcc) {
              changed = true;
              break;
            }
            if (
              remoteAcc.lastLoginAt !== localAcc.lastLoginAt ||
              remoteAcc.password !== localAcc.password ||
              remoteAcc.name !== localAcc.name ||
              remoteAcc.designation !== localAcc.designation ||
              remoteAcc.department !== localAcc.department ||
              remoteAcc.role !== localAcc.role ||
              remoteAcc.program !== localAcc.program ||
              JSON.stringify(remoteAcc.assignedPrograms) !== JSON.stringify(localAcc.assignedPrograms) ||
              JSON.stringify(remoteAcc.assignedShifts) !== JSON.stringify(localAcc.assignedShifts) ||
              remoteAcc.avatarUrl !== localAcc.avatarUrl ||
              remoteAcc.themePreference !== localAcc.themePreference ||
              remoteAcc.email !== localAcc.email ||
              remoteAcc.approvalStatus !== localAcc.approvalStatus
            ) {
              changed = true;
              break;
            }
          }
        }

        if (changed) {
          this.saveAccounts(newMergedList);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mnsuet_auth_changed'));
          }
        }
      });
    } catch (e) {
      console.warn('Firebase user sync listener init note:', e);
    }

    // 2. Fetch users from backend SQLite API and sync
    if (typeof window !== 'undefined') {
      fetch('/api/users')
        .then((res) => {
          if (!res.ok) throw new Error('API fetch failed');
          return res.json();
        })
        .then((apiUsers: UserAccount[]) => {
          if (!Array.isArray(apiUsers) || apiUsers.length === 0) return;
          const localAccounts = this.getAccounts();
          let changed = false;

          const mergedMap = new Map<string, UserAccount>();
          localAccounts.forEach((acc) => mergedMap.set(acc.id, acc));

          apiUsers.forEach((remoteAcc) => {
            if (!mergedMap.has(remoteAcc.id)) {
              mergedMap.set(remoteAcc.id, remoteAcc);
              changed = true;
            }
          });

          if (changed) {
            this.saveAccounts(Array.from(mergedMap.values()));
            window.dispatchEvent(new CustomEvent('mnsuet_auth_changed'));
          }
        })
        .catch((e) => {
          console.warn('Backend SQLite user fetch sync note:', e);
        });
    }
  }

  public static getAccounts(): UserAccount[] {
    try {
      const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (!raw) {
        return DEFAULT_ACCOUNTS;
      }
      const parsed: UserAccount[] = JSON.parse(raw);
      // Ensure master default accounts are always included
      const mergedMap = new Map<string, UserAccount>();
      DEFAULT_ACCOUNTS.forEach((acc) => mergedMap.set(acc.id, acc));
      parsed.forEach((acc) => mergedMap.set(acc.id, acc));
      return Array.from(mergedMap.values());
    } catch (e) {
      console.warn('Error reading accounts, using defaults', e);
      return DEFAULT_ACCOUNTS;
    }
  }

  // Save updated accounts array locally and trigger sync
  private static saveAccounts(accounts: UserAccount[]): void {
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.error('Failed to save accounts', e);
    }
  }

  // Get current authenticated user session
  public static getCurrentSession(): ActiveUserSession | null {
    try {
      const raw = localStorage.getItem(ACTIVE_AUTH_SESSION_KEY);
      if (!raw) return null;
      const session: ActiveUserSession = JSON.parse(raw);

      // Keep session updated with any changes in accounts storage
      const accounts = this.getAccounts();
      const account = accounts.find((a) => a.id === session.id);
      if (account) {
        session.role = account.role;
        session.program = account.program;
        session.assignedPrograms = account.assignedPrograms;
        session.assignedShifts = account.assignedShifts;
        session.department = account.department;
        session.designation = account.designation;
        session.name = account.name;
        session.avatarUrl = account.avatarUrl;
        session.themePreference = account.themePreference;
        session.email = account.email;
      } else {
        // Force signout if their account is deleted from systems
        localStorage.removeItem(ACTIVE_AUTH_SESSION_KEY);
        return null;
      }

      return session;
    } catch (e) {
      return null;
    }
  }

  // Set current user session
  public static setCurrentSession(session: ActiveUserSession | null): void {
    try {
      if (!session) {
        localStorage.removeItem(ACTIVE_AUTH_SESSION_KEY);
      } else {
        localStorage.setItem(ACTIVE_AUTH_SESSION_KEY, JSON.stringify(session));
      }
      // Dispatch custom event for real-time app re-render
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('mnsuet_auth_changed', { detail: { session } })
        );
      }
    } catch (e) {
      console.error('Failed to save auth session', e);
    }
  }

  // Login handler with anti-hacking lockout, rate limiting, and email/username matching
  public static async login(
    usernameInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; message: string; session?: ActiveUserSession; isLocked?: boolean; remainingSeconds?: number }> {
    const cleanUser = SecurityService.sanitizeInput(usernameInput).trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, message: 'Please enter both username and password.' };
    }

    // 1. Check Anti-Brute-Force Lockout
    const lockout = SecurityService.checkLoginLockout(cleanUser);
    if (lockout.isLocked) {
      return {
        success: false,
        message: `Account is temporarily locked due to repeated failed login attempts. Please wait ${lockout.remainingSeconds} seconds before trying again.`,
        isLocked: true,
        remainingSeconds: lockout.remainingSeconds,
      };
    }

    const accounts = this.getAccounts();
    // Allow login via username OR registered institutional email address
    const account = accounts.find(
      (a) =>
        a.username.trim().toLowerCase() === cleanUser ||
        (a.email && a.email.trim().toLowerCase() === cleanUser)
    );

    if (!account) {
      SecurityService.recordFailedLogin(cleanUser);
      SecurityService.logSecurityEvent({
        type: 'LOGIN_FAILED',
        severity: 'WARNING',
        actor: cleanUser,
        details: `Login failed: Account "${cleanUser}" does not exist in university records.`,
      });
      return { success: false, message: 'Invalid credentials. User does not exist.' };
    }

    const isPasswordCorrect = SecurityHelper.verifyPassword(cleanPass, account.password);

    if (!isPasswordCorrect) {
      const lockState = SecurityService.recordFailedLogin(cleanUser);
      SecurityService.logSecurityEvent({
        type: 'LOGIN_FAILED',
        severity: lockState.isLocked ? 'CRITICAL' : 'WARNING',
        actor: account.username,
        targetAccount: account.username,
        details: `Invalid password entered for account ${account.username} (${account.name}). Remaining attempts: ${lockState.remainingAttempts}.`,
      });

      if (lockState.isLocked) {
        return {
          success: false,
          message: `Account locked due to consecutive failed attempts. Please wait ${lockState.remainingSeconds} seconds.`,
          isLocked: true,
          remainingSeconds: lockState.remainingSeconds,
        };
      }

      const remainingAttempts = lockState.remainingAttempts;
      return {
        success: false,
        message: `Invalid password. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining before temporary lockout.` : ''}`,
      };
    }

    // Login successful
    SecurityService.resetFailedLogin(cleanUser);
    account.lastLoginAt = new Date().toISOString();
    this.saveAccounts(accounts);

    // Sync last login to backend & Firestore
    FirebaseStore.saveUserAccount(account).catch(() => {});
    if (typeof window !== 'undefined') {
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account),
      }).catch(() => {});
    }

    SecurityService.logSecurityEvent({
      type: 'LOGIN_SUCCESS',
      severity: 'INFO',
      actor: account.username,
      targetAccount: account.username,
      details: `Successful authenticated login for ${account.name} (${account.designation}) [${account.role}].`,
    });

    const session: ActiveUserSession = {
      id: account.id,
      username: account.username,
      email: account.email,
      name: account.name,
      designation: account.designation,
      department: account.department,
      role: account.role,
      program: account.program,
      assignedPrograms: account.assignedPrograms,
      assignedShifts: account.assignedShifts,
      programShiftAssignments: account.programShiftAssignments,
      approvalStatus: account.approvalStatus || 'APPROVED',
      requestedPrograms: account.requestedPrograms,
      requestedShifts: account.requestedShifts,
      requestedAt: account.requestedAt,
      approvedBy: account.approvedBy,
      approvedAt: account.approvedAt,
      avatarUrl: account.avatarUrl,
      themePreference: account.themePreference,
      token: `auth_tok_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };

    if (account.themePreference) {
      this.applyTheme(account.themePreference);
    }

    this.setCurrentSession(session);
    return {
      success: true,
      message: `Welcome, ${account.name}! Authenticated as ${account.role === 'COORDINATOR' ? `Coordinator (${account.program || 'Program'})` : account.role}.`,
      session,
    };
  }

  // Check whether another coordinator or lecturer in the same department & program already holds the requested shift(s)
  public static checkDeptProgramShiftConflict(
    department: string,
    program: string,
    requestedShifts: AcademicShift[],
    targetUserId?: string
  ): { hasConflict: boolean; conflictingUser?: string; conflictingShift?: AcademicShift; message?: string } {
    const accounts = this.getAccounts();
    const normDept = (department || '').trim().toLowerCase();
    const normProg = (program || '').trim().toLowerCase();

    for (const acc of accounts) {
      if (targetUserId && acc.id === targetUserId) continue;
      if (acc.username.toLowerCase() === 'admin' || acc.username.toLowerCase() === 'vc') continue;
      if (acc.approvalStatus === 'REJECTED') continue;

      const accDept = (acc.department || '').trim().toLowerCase();
      if (accDept !== normDept && !accDept.includes(normDept) && !normDept.includes(accDept)) continue;

      const assignedProgs = acc.assignedPrograms && acc.assignedPrograms.length > 0
        ? acc.assignedPrograms
        : acc.program ? [acc.program] : [];

      const matchesProg = assignedProgs.some(
        (p) => p.trim().toLowerCase() === normProg || p.trim().toLowerCase().includes(normProg) || normProg.includes(p.trim().toLowerCase())
      );

      if (!matchesProg) continue;

      let existingShifts: AcademicShift[] = [];
      if (acc.programShiftAssignments && acc.programShiftAssignments[program]) {
        existingShifts = acc.programShiftAssignments[program];
      } else if (acc.assignedShifts && acc.assignedShifts.length > 0) {
        existingShifts = acc.assignedShifts;
      } else {
        existingShifts = ['Morning', 'Evening'];
      }

      for (const reqShift of requestedShifts) {
        if (existingShifts.includes(reqShift)) {
          return {
            hasConflict: true,
            conflictingUser: acc.name,
            conflictingShift: reqShift,
            message: `Account Conflict Detected: Same Department, Program, and Shift combination is already registered. An active account for ${acc.name} (${acc.designation}) is already assigned to ${program} under the ${reqShift} shift for the ${department}. Multiple user accounts for the exact same offering are prohibited in order to secure student record management.`,
          };
        }
      }
    }

    return { hasConflict: false };
  }

  // Check whether another coordinator in same department & program already holds the requested shift(s)
  public static checkShiftConflict(
    department: string,
    program: string,
    requestedShifts: AcademicShift[],
    targetUserId?: string
  ): { hasConflict: boolean; conflictingUser?: string; conflictingShift?: AcademicShift; message?: string } {
    const accounts = this.getAccounts();
    const normDept = (department || '').trim().toLowerCase();
    const normProg = (program || '').trim().toLowerCase();

    for (const acc of accounts) {
      if (targetUserId && acc.id === targetUserId) continue;
      if (acc.role !== 'COORDINATOR' && acc.role !== 'LECTURER') continue;
      if (acc.approvalStatus === 'REJECTED') continue;

      const accDept = (acc.department || '').trim().toLowerCase();
      if (accDept !== normDept && !accDept.includes(normDept) && !normDept.includes(accDept)) continue;

      const assignedProgs = acc.assignedPrograms && acc.assignedPrograms.length > 0
        ? acc.assignedPrograms
        : acc.program ? [acc.program] : [];

      const matchesProg = assignedProgs.some(
        (p) => p.trim().toLowerCase() === normProg || p.trim().toLowerCase().includes(normProg) || normProg.includes(p.trim().toLowerCase())
      );

      if (!matchesProg) continue;

      let existingShifts: AcademicShift[] = [];
      if (acc.programShiftAssignments && acc.programShiftAssignments[program]) {
        existingShifts = acc.programShiftAssignments[program];
      } else if (acc.assignedShifts && acc.assignedShifts.length > 0) {
        existingShifts = acc.assignedShifts;
      } else {
        existingShifts = ['Morning', 'Evening'];
      }

      for (const reqShift of requestedShifts) {
        if (existingShifts.includes(reqShift)) {
          return {
            hasConflict: true,
            conflictingUser: acc.name,
            conflictingShift: reqShift,
            message: `Shift Conflict Detected: ${acc.name} (${acc.designation}) is already assigned as ${reqShift} Shift Coordinator for ${program}. Two coordinators cannot hold the same shift for a program. One must be Morning and the other Evening. Please select a non-conflicting shift or contact your HOD.`,
          };
        }
      }
    }

    return { hasConflict: false };
  }

  // Register a new HOD / Coordinator / Faculty account with strict institutional validation
  public static registerAccount(data: {
    username: string;
    email: string;
    password: string;
    name: string;
    department: string;
    designation: string;
    role?: UserRole;
    program?: string;
    assignedPrograms?: string[];
    assignedShifts?: AcademicShift[];
    programShiftAssignments?: Record<string, AcademicShift[]>;
    approvalStatus?: 'APPROVED' | 'PENDING' | 'REJECTED';
  }): { success: boolean; message: string; session?: ActiveUserSession } {
    const cleanUser = SecurityService.sanitizeInput(data.username).trim();
    const cleanEmail = SecurityService.sanitizeInput(data.email || '').trim().toLowerCase();
    const cleanPass = data.password.trim();
    const cleanName = SecurityService.sanitizeInput(data.name).trim();
    const cleanDept = SecurityService.sanitizeInput(data.department).trim();
    const cleanDesig = SecurityService.sanitizeInput(data.designation).trim() || 'HOD / Coordinator';
    const assignedRole = data.role || (cleanDesig.toLowerCase().includes('coordinator') ? 'COORDINATOR' : 'HOD');

    if (!cleanUser || !cleanPass || !cleanName || !cleanDept || !cleanEmail) {
      return { success: false, message: 'All fields are required, including your official institutional email address.' };
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return { success: false, message: 'Please enter a valid official institutional email address (e.g. faculty@mnsuet.edu.pk).' };
    }

    // Password strength check
    const strength = SecurityService.validatePasswordStrength(cleanPass);
    if (!strength.isValid) {
      return { success: false, message: strength.message };
    }

    const accounts = this.getAccounts();

    // RULE 1: Strictly unique username
    const existingUser = accounts.find(
      (a) => a.username.trim().toLowerCase() === cleanUser.toLowerCase()
    );
    if (existingUser) {
      return {
        success: false,
        message: `Username "${cleanUser}" is already taken. Please choose a unique username.`,
      };
    }

    // RULE 2: Strictly ONE account per institutional email address (Institutional Policy)
    const existingEmailAccount = accounts.find(
      (a) => a.email && a.email.trim().toLowerCase() === cleanEmail
    );
    if (existingEmailAccount) {
      return {
        success: false,
        message: `Security Policy Error: Same account with email (${cleanEmail}) is already built for ${existingEmailAccount.name}. Duplicate account creation for the same user or role is strictly prohibited to prevent unauthorized access. Please log in with your credentials or communicate with Admin.`,
      };
    }

    // RULE 2.1: Strictly ONE HOD Account per Department (Prevent Fake HOD Access)
    const isHodRole = assignedRole === 'HOD' || cleanDesig.toLowerCase().includes('hod') || cleanDesig.toLowerCase().includes('head of department');
    if (isHodRole) {
      const existingHOD = accounts.find(
        (a) =>
          a.department.trim().toLowerCase() === cleanDept.toLowerCase() &&
          (a.role === 'HOD' || (a.designation && (a.designation.toLowerCase().includes('hod') || a.designation.toLowerCase().includes('head of department'))))
      );
      if (existingHOD) {
        return {
          success: false,
          message: `Security Error: Same account of Head of Department (HOD) role is already built for ${cleanDept} (${existingHOD.name}). Duplicate account creation for HOD is blocked to prevent fake users from taking unauthorized system access. Please communicate with Admin / Vice Chancellor Office.`,
        };
      }
    }

    const rawAssigned = data.assignedPrograms && data.assignedPrograms.length > 0
      ? data.assignedPrograms.map((p) => SecurityService.sanitizeInput(p).trim()).filter(Boolean)
      : data.program
      ? [SecurityService.sanitizeInput(data.program).trim()]
      : [];

    const primaryProgram = rawAssigned[0] || (data.program ? SecurityService.sanitizeInput(data.program).trim() : undefined);

    // RULE 3: Strictly ONE account for the same faculty member name in the same department
    const samePersonAccounts = accounts.filter(
      (a) =>
        a.name.trim().toLowerCase() === cleanName.toLowerCase() &&
        a.department.trim().toLowerCase() === cleanDept.toLowerCase()
    );
    if (samePersonAccounts.length >= 1) {
      return {
        success: false,
        message: `An account already exists for "${cleanName}" in ${cleanDept}. Each faculty member has a single institutional account. Please log in or use password recovery.`,
      };
    }

    const resolvedShifts: AcademicShift[] | undefined = data.assignedShifts && data.assignedShifts.length > 0
      ? data.assignedShifts
      : (assignedRole === 'COORDINATOR' ? ['Morning', 'Evening'] : undefined);

    // RULE 4: Strictly prevent duplicate accounts under the same Department, Program, and Shift
    if (assignedRole !== 'HOD' && assignedRole !== 'VC' && assignedRole !== 'ADMIN' && rawAssigned.length > 0) {
      for (const prog of rawAssigned) {
        const shiftsForProg = data.programShiftAssignments && data.programShiftAssignments[prog]
          ? data.programShiftAssignments[prog]
          : resolvedShifts || ['Morning', 'Evening'];
        const conflict = this.checkDeptProgramShiftConflict(cleanDept, prog, shiftsForProg);
        if (conflict.hasConflict) {
          return {
            success: false,
            message: conflict.message!,
          };
        }
      }
    }

    const isCoordinator = assignedRole === 'COORDINATOR';
    const initialApproval: 'APPROVED' | 'PENDING' | 'REJECTED' = data.approvalStatus || (isCoordinator ? 'PENDING' : 'APPROVED');

    const newAccount: UserAccount = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUser,
      email: cleanEmail,
      password: SecurityHelper.hashPassword(cleanPass),
      name: cleanName,
      department: cleanDept,
      designation: cleanDesig,
      role: assignedRole,
      program: assignedRole !== 'HOD' ? primaryProgram : undefined,
      assignedPrograms: assignedRole !== 'HOD' && rawAssigned.length > 0 ? rawAssigned : undefined,
      assignedShifts: assignedRole !== 'HOD' ? resolvedShifts : undefined,
      programShiftAssignments: assignedRole !== 'HOD' ? data.programShiftAssignments : undefined,
      approvalStatus: initialApproval,
      requestedPrograms: isCoordinator ? rawAssigned : undefined,
      requestedShifts: isCoordinator ? resolvedShifts : undefined,
      requestedAt: isCoordinator ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      themePreference: 'emerald',
    };

    accounts.push(newAccount);
    this.saveAccounts(accounts);

    // Synchronize to Firestore cloud database
    FirebaseStore.saveUserAccount(newAccount).catch((e) => {
      console.warn('Firebase account sync error:', e);
    });

    // Synchronize to backend SQLite database
    if (typeof window !== 'undefined') {
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccount),
      }).catch((e) => {
        console.warn('SQLite account sync error:', e);
      });
    }

    SecurityService.logSecurityEvent({
      type: 'LOGIN_SUCCESS',
      severity: 'INFO',
      actor: newAccount.username,
      targetAccount: newAccount.username,
      details: `New account registered: ${newAccount.username} [${newAccount.role} - ${newAccount.department}] (Status: ${newAccount.approvalStatus}). Requested Programs: ${newAccount.assignedPrograms?.join(', ') || newAccount.program || 'None'}.`,
    });

    const session: ActiveUserSession = {
      id: newAccount.id,
      username: newAccount.username,
      email: newAccount.email,
      name: newAccount.name,
      designation: newAccount.designation,
      department: newAccount.department,
      role: newAccount.role,
      program: newAccount.program,
      assignedPrograms: newAccount.assignedPrograms,
      assignedShifts: newAccount.assignedShifts,
      programShiftAssignments: newAccount.programShiftAssignments,
      approvalStatus: newAccount.approvalStatus,
      requestedPrograms: newAccount.requestedPrograms,
      requestedShifts: newAccount.requestedShifts,
      requestedAt: newAccount.requestedAt,
      token: `auth_tok_${Date.now()}`,
    };

    this.setCurrentSession(session);
    return {
      success: true,
      message: initialApproval === 'PENDING'
        ? `Account registered! As a Coordinator, your program assignment request has been queued for authorization by your Head of Department (HOD).`
        : `Account created and synced in university database successfully for ${newAccount.name} (${newAccount.department}).`,
      session,
    };
  }

  // ---------------------------------------------------------------------------
  // PASSWORD RECOVERY / FORGOT PASSWORD SYSTEM (STRICT INSTITUTIONAL EMAIL)
  // ---------------------------------------------------------------------------
  public static initiatePasswordReset(emailInput: string): {
    success: boolean;
    message: string;
    email?: string;
    username?: string;
    resetToken?: string;
    otpCode?: string;
  } {
    const clean = SecurityService.sanitizeInput(emailInput).trim();
    if (!clean) {
      return { success: false, message: 'Please enter your registered institutional email address.' };
    }

    if (!clean.includes('@')) {
      return {
        success: false,
        message: 'Institutional email address is compulsory for password recovery. Please enter your valid registered email (e.g. faculty@mnsuet.edu.pk).',
      };
    }

    const accounts = this.getAccounts();
    const cleanLower = clean.toLowerCase();

    // Must match registered account's exact email address
    let account = accounts.find(
      (a) => a.email && a.email.trim().toLowerCase() === cleanLower
    );

    // Fallback if user typed their username but it has an associated email
    if (!account) {
      account = accounts.find(
        (a) => a.username.trim().toLowerCase() === cleanLower
      );
    }

    if (!account) {
      SecurityService.logSecurityEvent({
        type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        severity: 'WARNING',
        actor: clean,
        details: `Password reset attempted with unregistered institutional email: "${clean}".`,
      });
      return {
        success: false,
        message: 'Unrecognized institutional email. Please enter the exact institutional email you used during account registration.',
      };
    }

    const targetEmail = account.email?.trim();
    if (!targetEmail) {
      return {
        success: false,
        message: 'No institutional email associated with this account. Please contact the IT Administrator.',
      };
    }

    const resetData = SecurityService.createPasswordResetRequest({
      accountId: account.id,
      username: account.username,
      email: targetEmail,
    });

    return {
      success: true,
      message: `Password reset verification security OTP dispatched to institutional email: ${targetEmail}`,
      email: targetEmail,
      username: account.username,
      resetToken: resetData.resetToken,
      otpCode: resetData.otpCode,
    };
  }

  public static verifyPasswordResetCode(
    resetToken: string,
    otpCode: string
  ): { success: boolean; message: string } {
    return SecurityService.verifyResetOtp(resetToken, otpCode);
  }

  public static completePasswordReset(
    resetToken: string,
    newPassword: string
  ): { success: boolean; message: string } {
    const req = SecurityService.getActiveResetRequest();
    if (!req || req.resetToken !== resetToken) {
      return { success: false, message: 'Password reset session invalid or expired. Please start over.' };
    }

    if (!req.verified) {
      return { success: false, message: 'Please verify the 6-digit institutional email security code first.' };
    }

    const strength = SecurityService.validatePasswordStrength(newPassword);
    if (!strength.isValid) {
      return { success: false, message: strength.message };
    }

    const accounts = this.getAccounts();
    const account = accounts.find((a) => a.id === req.accountId || a.username.toLowerCase() === req.username.toLowerCase());
    if (!account) {
      return { success: false, message: 'Target user account could not be found in university database.' };
    }

    account.password = SecurityHelper.hashPassword(newPassword.trim());
    this.saveAccounts(accounts);
    SecurityService.clearResetRequest();
    SecurityService.resetFailedLogin(account.username);

    // Sync updated password to Firestore cloud database
    FirebaseStore.saveUserAccount(account).catch((e) => {
      console.warn('Firebase password reset sync error:', e);
    });

    // Sync updated password to backend SQLite database
    if (typeof window !== 'undefined') {
      fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: account.id,
          username: account.username,
          email: account.email,
          password: account.password,
        }),
      }).catch((e) => {
        console.warn('SQLite password reset sync error:', e);
      });
    }

    SecurityService.logSecurityEvent({
      type: 'PASSWORD_RESET_COMPLETED',
      severity: 'INFO',
      actor: account.username,
      targetAccount: account.username,
      details: `Password successfully updated and database-synced via verified institutional email token.`,
    });

    return {
      success: true,
      message: `Password successfully updated in university database for ${account.name}! You can now log in with your new password.`,
    };
  }

  // Logout
  public static logout(): void {
    this.setCurrentSession(null);
  }

  // Delete an account (Admin only)
  public static deleteAccount(accountId: string): { success: boolean; message: string } {
    const accounts = this.getAccounts();
    const target = accounts.find((a) => a.id === accountId);
    if (!target) {
      return { success: false, message: 'Account not found.' };
    }

    // Do not allow deleting the master Admin or VC account
    if (target.username.toLowerCase() === 'admin' || target.username.toLowerCase() === 'vc') {
      return { success: false, message: 'Cannot delete core institutional administrative root accounts.' };
    }

    const filtered = accounts.filter((a) => a.id !== accountId);
    this.saveAccounts(filtered);

    // Sync deletion to Firestore
    FirebaseStore.deleteUserAccount(accountId).catch(() => {});

    // Sync deletion to SQLite backend
    if (typeof window !== 'undefined') {
      fetch(`/api/users/${accountId}`, { method: 'DELETE' }).catch(() => {});
    }

    return { success: true, message: `Account "${target.username}" deleted successfully from all systems.` };
  }

  // Update Profile: Name, Designation, Avatar, Password, Theme, Role, Program, Assigned Programs, Department
  public static updateProfile(
    userId: string,
    data: {
      name?: string;
      email?: string;
      designation?: string;
      avatarUrl?: string;
      oldPassword?: string;
      newPassword?: string;
      themePreference?: AppTheme | 'light' | 'dark';
      role?: UserRole;
      department?: string;
      program?: string;
      assignedPrograms?: string[];
      assignedShifts?: AcademicShift[];
      programShiftAssignments?: Record<string, AcademicShift[]>;
      approvalStatus?: 'APPROVED' | 'PENDING' | 'REJECTED';
      requestedPrograms?: string[];
      requestedShifts?: AcademicShift[];
      rejectionReason?: string;
    }
  ): { success: boolean; message: string; session?: ActiveUserSession } {
    const accounts = this.getAccounts();
    const account = accounts.find((a) => a.id === userId);

    if (!account) {
      return { success: false, message: 'Account not found.' };
    }

    // If changing password, verify old password
    if (data.newPassword !== undefined && data.newPassword.trim().length > 0) {
      if (!data.oldPassword) {
        return {
          success: false,
          message: 'Please enter your current password to set a new password.',
        };
      }
      if (!SecurityHelper.verifyPassword(data.oldPassword.trim(), account.password)) {
        return {
          success: false,
          message: 'Current password does not match. Please verify and try again.',
        };
      }
      if (data.newPassword.trim().length < 4) {
        return {
          success: false,
          message: 'New password must be at least 4 characters long.',
        };
      }
      account.password = SecurityHelper.hashPassword(data.newPassword.trim());
    }

    // Update name
    if (data.name !== undefined && data.name.trim().length > 0) {
      account.name = data.name.trim();
    }

    // Update email (strictly unique per account in accordance with institutional policy)
    if (data.email !== undefined && data.email.trim().length > 0) {
      const cleanNewEmail = data.email.trim().toLowerCase();
      const dupEmail = accounts.find(
        (a) => a.id !== userId && a.email && a.email.trim().toLowerCase() === cleanNewEmail
      );
      if (dupEmail) {
        return {
          success: false,
          message: `The institutional email "${data.email.trim()}" is already registered to another account (${dupEmail.name}). In accordance with institutional policy, each account must have a unique email.`,
        };
      }
      account.email = data.email.trim();
    }

    // Update designation
    if (data.designation !== undefined) {
      account.designation = data.designation.trim();
    }

    // Update role (if not master admin or VC)
    if (data.role !== undefined && account.role !== 'ADMIN' && account.role !== 'VC') {
      account.role = data.role;
    }

    // Update department (if not master admin or VC)
    if (data.department !== undefined && data.department.trim().length > 0 && account.role !== 'ADMIN' && account.role !== 'VC') {
      account.department = data.department.trim();
    }

    // Update program (for Coordinator)
    if (data.program !== undefined) {
      account.program = data.program.trim() || undefined;
    }

    // Update multiple assigned programs
    if (data.assignedPrograms !== undefined) {
      account.assignedPrograms = data.assignedPrograms.length > 0 ? data.assignedPrograms : undefined;
    }

    // Update coordinated shifts (e.g. Morning & Evening)
    if (data.assignedShifts !== undefined) {
      account.assignedShifts = data.assignedShifts.length > 0 ? data.assignedShifts : undefined;
    }

    // Update program-specific shift assignments
    if (data.programShiftAssignments !== undefined) {
      account.programShiftAssignments = Object.keys(data.programShiftAssignments).length > 0 ? data.programShiftAssignments : undefined;
    }

    // Update approval status
    if (data.approvalStatus !== undefined) {
      account.approvalStatus = data.approvalStatus;
    }

    // Update avatarUrl (can be empty string to remove avatar)
    if (data.avatarUrl !== undefined) {
      account.avatarUrl = data.avatarUrl.trim();
    }

    // Update themePreference
    if (data.themePreference) {
      account.themePreference = data.themePreference;
      this.applyTheme(data.themePreference);
    }

    // RULE 4: Strictly prevent duplicate accounts under the same Department, Program, and Shift on profile updates
    const finalRole = data.role !== undefined ? data.role : account.role;
    if (finalRole !== 'HOD' && finalRole !== 'VC' && finalRole !== 'ADMIN') {
      const finalDept = data.department !== undefined ? data.department : account.department;
      const finalAssignedProgs = data.assignedPrograms !== undefined
        ? data.assignedPrograms
        : (account.assignedPrograms || (account.program ? [account.program] : []));
      const finalShifts = data.assignedShifts !== undefined
        ? data.assignedShifts
        : (account.assignedShifts || ['Morning', 'Evening']);

      if (finalAssignedProgs && finalAssignedProgs.length > 0) {
        for (const prog of finalAssignedProgs) {
          const shiftsForProg = data.programShiftAssignments && data.programShiftAssignments[prog]
            ? data.programShiftAssignments[prog]
            : finalShifts;
          const conflict = this.checkDeptProgramShiftConflict(finalDept, prog, shiftsForProg, userId);
          if (conflict.hasConflict) {
            return {
              success: false,
              message: conflict.message!,
            };
          }
        }
      }
    }

    this.saveAccounts(accounts);

    // Sync update to Firestore cloud database
    FirebaseStore.saveUserAccount(account).catch(() => {});

    // Sync update to backend SQLite database
    if (typeof window !== 'undefined') {
      fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account),
      }).catch(() => {});
    }

    // Update active session if this is the currently logged-in user
    const currentSession = this.getCurrentSession();
    let updatedSession: ActiveUserSession | undefined = undefined;

    if (currentSession && currentSession.id === userId) {
      updatedSession = {
        ...currentSession,
        name: account.name,
        email: account.email,
        designation: account.designation,
        department: account.department,
        role: account.role,
        program: account.program,
        assignedPrograms: account.assignedPrograms,
        assignedShifts: account.assignedShifts,
        programShiftAssignments: account.programShiftAssignments,
        approvalStatus: account.approvalStatus,
        requestedPrograms: account.requestedPrograms,
        requestedShifts: account.requestedShifts,
        requestedAt: account.requestedAt,
        approvedBy: account.approvedBy,
        approvedAt: account.approvedAt,
        avatarUrl: account.avatarUrl,
        themePreference: account.themePreference,
      };
      this.setCurrentSession(updatedSession);
    }

    return {
      success: true,
      message: 'Profile updated and synchronized successfully!',
      session: updatedSession || currentSession || undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // HOD APPROVAL WORKFLOW FOR COORDINATORS
  // ---------------------------------------------------------------------------
  // Request HOD approval or re-send approval request
  public static requestHODApproval(
    userId: string,
    requestedPrograms?: string[],
    requestedShifts?: AcademicShift[]
  ): { success: boolean; message: string; session?: ActiveUserSession } {
    const accounts = this.getAccounts();
    const account = accounts.find((a) => a.id === userId);
    if (!account) return { success: false, message: 'Account not found.' };

    account.approvalStatus = 'PENDING';
    account.requestedAt = new Date().toISOString();
    account.rejectionReason = undefined;

    if (requestedPrograms && requestedPrograms.length > 0) {
      account.requestedPrograms = requestedPrograms;
    } else if (!account.requestedPrograms || account.requestedPrograms.length === 0) {
      account.requestedPrograms = account.assignedPrograms || (account.program ? [account.program] : []);
    }

    if (requestedShifts && requestedShifts.length > 0) {
      account.requestedShifts = requestedShifts;
    } else if (!account.requestedShifts || account.requestedShifts.length === 0) {
      account.requestedShifts = account.assignedShifts || ['Morning', 'Evening'];
    }

    this.saveAccounts(accounts);
    FirebaseStore.saveUserAccount(account).catch(() => {});
    if (typeof window !== 'undefined') {
      fetch(`/api/users/${account.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account),
      }).catch(() => {});
    }

    const currentSession = this.getCurrentSession();
    let updatedSession: ActiveUserSession | undefined = undefined;
    if (currentSession && currentSession.id === userId) {
      updatedSession = {
        ...currentSession,
        approvalStatus: 'PENDING',
        requestedPrograms: account.requestedPrograms,
        requestedShifts: account.requestedShifts,
        requestedAt: account.requestedAt,
      };
      this.setCurrentSession(updatedSession);
    }

    SecurityService.logSecurityEvent({
      type: 'SECURITY_ALERT',
      severity: 'INFO',
      actor: account.username,
      targetAccount: account.username,
      details: `Coordinator ${account.name} submitted approval request to HOD of ${account.department} for programs: ${account.requestedPrograms?.join(', ') || 'Department Programs'}.`,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mnsuet_auth_changed'));
    }

    return {
      success: true,
      message: `Approval request forwarded to the Head of Department (HOD) for ${account.department}.`,
      session: updatedSession,
    };
  }

  // HOD or Admin approves coordinator account
  public static approveCoordinatorAccount(
    userId: string,
    approverName: string,
    assignedPrograms?: string[],
    assignedShifts?: AcademicShift[],
    role?: UserRole
  ): { success: boolean; message: string } {
    const accounts = this.getAccounts();
    const account = accounts.find((a) => a.id === userId);
    if (!account) return { success: false, message: 'Account not found.' };

    account.approvalStatus = 'APPROVED';
    account.approvedBy = approverName;
    account.approvedAt = new Date().toISOString();
    account.rejectionReason = undefined;

    if (role) {
      account.role = role;
    }

    const finalProgs = assignedPrograms && assignedPrograms.length > 0
      ? assignedPrograms
      : (account.requestedPrograms && account.requestedPrograms.length > 0 ? account.requestedPrograms : account.assignedPrograms);

    if (finalProgs && finalProgs.length > 0) {
      account.assignedPrograms = finalProgs;
      account.program = finalProgs[0];
    }

    const finalShifts = assignedShifts && assignedShifts.length > 0
      ? assignedShifts
      : (account.requestedShifts && account.requestedShifts.length > 0 ? account.requestedShifts : account.assignedShifts);

    if (finalShifts && finalShifts.length > 0) {
      account.assignedShifts = finalShifts;
    }

    this.saveAccounts(accounts);
    FirebaseStore.saveUserAccount(account).catch(() => {});
    if (typeof window !== 'undefined') {
      fetch(`/api/users/${account.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account),
      }).catch(() => {});
    }

    // If current logged-in session is this user, update active session
    const currentSession = this.getCurrentSession();
    if (currentSession && currentSession.id === userId) {
      const updatedSession: ActiveUserSession = {
        ...currentSession,
        approvalStatus: 'APPROVED',
        assignedPrograms: account.assignedPrograms,
        program: account.program,
        assignedShifts: account.assignedShifts,
        role: account.role,
        approvedBy: account.approvedBy,
        approvedAt: account.approvedAt,
      };
      this.setCurrentSession(updatedSession);
    }

    SecurityService.logSecurityEvent({
      type: 'USER_ROLE_CHANGED',
      severity: 'INFO',
      actor: approverName,
      targetAccount: account.username,
      details: `HOD ${approverName} approved and authorized Coordinator ${account.name} for programs: ${account.assignedPrograms?.join(', ')}.`,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mnsuet_auth_changed'));
    }

    return {
      success: true,
      message: `Coordinator "${account.name}" has been approved and granted access for ${account.assignedPrograms?.join(', ') || account.program || 'assigned programs'}.`,
    };
  }

  // HOD or Admin rejects coordinator account request
  public static rejectCoordinatorAccount(
    userId: string,
    rejectorName: string,
    reason?: string
  ): { success: boolean; message: string } {
    const accounts = this.getAccounts();
    const account = accounts.find((a) => a.id === userId);
    if (!account) return { success: false, message: 'Account not found.' };

    account.approvalStatus = 'REJECTED';
    account.rejectionReason = reason || 'Declined by Head of Department.';

    this.saveAccounts(accounts);
    FirebaseStore.saveUserAccount(account).catch(() => {});
    if (typeof window !== 'undefined') {
      fetch(`/api/users/${account.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account),
      }).catch(() => {});
    }

    const currentSession = this.getCurrentSession();
    if (currentSession && currentSession.id === userId) {
      this.setCurrentSession({
        ...currentSession,
        approvalStatus: 'REJECTED',
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mnsuet_auth_changed'));
    }

    return {
      success: true,
      message: `Account request for "${account.name}" has been declined.`,
    };
  }

  // Get pending coordinator approval requests for a specific department (or all if admin)
  public static getPendingApprovals(department?: string): UserAccount[] {
    const accounts = this.getAccounts();
    return accounts.filter((acc) => {
      if (acc.role === 'ADMIN' || acc.role === 'VC') return false;
      const isPending = acc.approvalStatus === 'PENDING';
      if (!isPending) return false;
      if (!department || department === 'ALL' || department === 'All Departments') return true;
      return acc.department.trim().toLowerCase() === department.trim().toLowerCase();
    });
  }

  // Self-service program removal: Coordinator can remove any or all of their assigned programs
  public static removeCoordinatorProgram(
    userId: string,
    programToRemove: string
  ): { success: boolean; message: string; session?: ActiveUserSession } {
    const accounts = this.getAccounts();
    const account = accounts.find((a) => a.id === userId);
    if (!account) return { success: false, message: 'User account not found.' };

    const cleanProg = programToRemove.trim();
    const currentAssigned = account.assignedPrograms || (account.program ? [account.program] : []);

    if (!currentAssigned.some((p) => p.trim().toLowerCase() === cleanProg.toLowerCase())) {
      return {
        success: false,
        message: `Program "${cleanProg}" is not in your current assigned programs list.`,
      };
    }

    const updatedAssigned = currentAssigned.filter(
      (p) => p.trim().toLowerCase() !== cleanProg.toLowerCase()
    );

    account.assignedPrograms = updatedAssigned;
    if (account.program && account.program.trim().toLowerCase() === cleanProg.toLowerCase()) {
      account.program = updatedAssigned.length > 0 ? updatedAssigned[0] : '';
    }

    if (account.programShiftAssignments && account.programShiftAssignments[cleanProg]) {
      delete account.programShiftAssignments[cleanProg];
    }

    this.saveAccounts(accounts);
    FirebaseStore.saveUserAccount(account).catch(() => {});
    if (typeof window !== 'undefined') {
      fetch(`/api/users/${account.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account),
      }).catch(() => {});
    }

    const currentSession = this.getCurrentSession();
    let updatedSession: ActiveUserSession | undefined;
    if (currentSession && currentSession.id === userId) {
      updatedSession = {
        ...currentSession,
        assignedPrograms: updatedAssigned,
        program: account.program,
        programShiftAssignments: account.programShiftAssignments,
      };
      this.setCurrentSession(updatedSession);
    }

    SecurityService.logSecurityEvent({
      type: 'SECURITY_ALERT',
      severity: 'INFO',
      actor: account.username,
      targetAccount: account.username,
      details: `Coordinator ${account.name} self-removed program "${cleanProg}" from assigned programs list. Remaining programs: ${updatedAssigned.length > 0 ? updatedAssigned.join(', ') : 'None'}.`,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mnsuet_auth_changed'));
      window.dispatchEvent(new CustomEvent('mnsuet_accounts_updated'));
    }

    return {
      success: true,
      message: updatedAssigned.length > 0
        ? `Program "${cleanProg}" has been removed from your active coordinated programs list.`
        : `Program "${cleanProg}" has been removed. You have no active assigned programs left. You can request a new program from your HOD at any time.`,
      session: updatedSession,
    };
  }

  // Remove all assigned programs for coordinator
  public static removeAllCoordinatorPrograms(
    userId: string
  ): { success: boolean; message: string; session?: ActiveUserSession } {
    const accounts = this.getAccounts();
    const account = accounts.find((a) => a.id === userId);
    if (!account) return { success: false, message: 'User account not found.' };

    account.assignedPrograms = [];
    account.program = '';
    account.programShiftAssignments = {};

    this.saveAccounts(accounts);
    FirebaseStore.saveUserAccount(account).catch(() => {});
    if (typeof window !== 'undefined') {
      fetch(`/api/users/${account.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account),
      }).catch(() => {});
    }

    const currentSession = this.getCurrentSession();
    let updatedSession: ActiveUserSession | undefined;
    if (currentSession && currentSession.id === userId) {
      updatedSession = {
        ...currentSession,
        assignedPrograms: [],
        program: '',
        programShiftAssignments: {},
      };
      this.setCurrentSession(updatedSession);
    }

    SecurityService.logSecurityEvent({
      type: 'SECURITY_ALERT',
      severity: 'INFO',
      actor: account.username,
      targetAccount: account.username,
      details: `Coordinator ${account.name} self-removed all assigned programs.`,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mnsuet_auth_changed'));
      window.dispatchEvent(new CustomEvent('mnsuet_accounts_updated'));
    }

    return {
      success: true,
      message: 'All assigned programs have been removed from your portfolio. You can request programs from your HOD at any time.',
      session: updatedSession,
    };
  }

  // Self-service add program when HOD permission is granted or user is Admin/HOD
  public static addCoordinatorProgram(
    userId: string,
    requestedProgram: string,
    requestedShifts: AcademicShift[] = ['Morning', 'Evening']
  ): { success: boolean; message: string; session?: ActiveUserSession } {
    const accounts = this.getAccounts();
    const account = accounts.find((a) => a.id === userId);
    if (!account) return { success: false, message: 'User account not found.' };

    const cleanProg = SecurityService.sanitizeInput(requestedProgram).trim();
    if (!cleanProg) return { success: false, message: 'Please specify a valid program name.' };

    const currentAssigned = account.assignedPrograms || (account.program ? [account.program] : []);
    if (currentAssigned.includes(cleanProg)) {
      return { success: true, message: `Program "${cleanProg}" is already assigned to your account.` };
    }

    const updatedAssigned = [...currentAssigned, cleanProg];
    account.assignedPrograms = updatedAssigned;
    if (!account.program) {
      account.program = cleanProg;
    }

    if (!account.programShiftAssignments) {
      account.programShiftAssignments = {};
    }
    account.programShiftAssignments[cleanProg] = requestedShifts;

    this.saveAccounts(accounts);
    FirebaseStore.saveUserAccount(account).catch(() => {});
    if (typeof window !== 'undefined') {
      fetch(`/api/users/${account.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account),
      }).catch(() => {});
    }

    const currentSession = this.getCurrentSession();
    let updatedSession: ActiveUserSession | undefined;
    if (currentSession && currentSession.id === userId) {
      updatedSession = {
        ...currentSession,
        assignedPrograms: updatedAssigned,
        program: account.program,
        programShiftAssignments: account.programShiftAssignments,
      };
      this.setCurrentSession(updatedSession);
    }

    SecurityService.logSecurityEvent({
      type: 'SECURITY_ALERT',
      severity: 'INFO',
      actor: account.username,
      targetAccount: account.username,
      details: `Coordinator ${account.name} added program "${cleanProg}" via self-service permission. Portfolio now includes: ${updatedAssigned.join(', ')}.`,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mnsuet_auth_changed'));
      window.dispatchEvent(new CustomEvent('mnsuet_accounts_updated'));
    }

    return {
      success: true,
      message: `Program "${cleanProg}" has been successfully added to your active coordinated programs list!`,
      session: updatedSession,
    };
  }

  // ---------------------------------------------------------------------------
  // POST-LOGIN ADDITIONAL PROGRAM ACCESS REQUESTS (COORDINATOR MULTI-PROGRAM)
  // ---------------------------------------------------------------------------

  // Request access to an additional program (or shift expansion) after login
  public static requestAdditionalProgramAccess(
    userId: string,
    requestedProgram: string,
    requestedShifts: AcademicShift[],
    reason?: string
  ): { success: boolean; message: string; request?: ProgramAccessRequest } {
    const accounts = this.getAccounts();
    const account = accounts.find((a) => a.id === userId);
    if (!account) return { success: false, message: 'User account not found.' };

    const cleanProg = SecurityService.sanitizeInput(requestedProgram).trim();
    if (!cleanProg) return { success: false, message: 'Please specify a valid program name.' };

    const shifts = requestedShifts && requestedShifts.length > 0 ? requestedShifts : ['Morning', 'Evening'] as AcademicShift[];

    if (!account.pendingProgramRequests) {
      account.pendingProgramRequests = [];
    }

    // Check if program already actively assigned and has matching shifts
    const alreadyAssigned = (account.assignedPrograms || []).includes(cleanProg);
    const existingShifts = account.programShiftAssignments?.[cleanProg] || account.assignedShifts || [];
    const hasAllShifts = shifts.every((s) => existingShifts.includes(s));
    if (alreadyAssigned && hasAllShifts && account.approvalStatus === 'APPROVED') {
      return {
        success: false,
        message: `You are already authorized for "${cleanProg}" (${shifts.join(', ')}). You can select it directly from your program dropdown.`,
      };
    }

    // Check if there is already a pending request for this program
    const existingPending = account.pendingProgramRequests.find(
      (r) => r.requestedProgram.toLowerCase() === cleanProg.toLowerCase() && r.status === 'PENDING'
    );
    if (existingPending) {
      return {
        success: false,
        message: `A request for "${cleanProg}" is already pending review by your Head of Department.`,
      };
    }

    const newRequest: ProgramAccessRequest = {
      id: `prog_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: account.id,
      userName: account.name,
      userEmail: account.email,
      department: account.department,
      requestedProgram: cleanProg,
      requestedShifts: shifts,
      reason: reason ? SecurityService.sanitizeInput(reason).trim() : undefined,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
    };

    account.pendingProgramRequests.push(newRequest);

    this.saveAccounts(accounts);
    FirebaseStore.saveUserAccount(account).catch(() => {});
    if (typeof window !== 'undefined') {
      fetch(`/api/users/${account.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account),
      }).catch(() => {});
    }

    // Update active session if this is the logged-in user
    const currentSession = this.getCurrentSession();
    if (currentSession && currentSession.id === userId) {
      this.setCurrentSession({
        ...currentSession,
        pendingProgramRequests: account.pendingProgramRequests,
      });
    }

    SecurityService.logSecurityEvent({
      type: 'SECURITY_ALERT',
      severity: 'INFO',
      actor: account.username,
      targetAccount: account.username,
      details: `Coordinator ${account.name} submitted post-login request to HOD of ${account.department} for additional program access: "${cleanProg}" (${shifts.join(', ')}).`,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mnsuet_auth_changed'));
      window.dispatchEvent(new CustomEvent('mnsuet_accounts_updated'));
    }

    return {
      success: true,
      message: `Request for "${cleanProg}" (${shifts.join(', ')}) submitted to Head of Department (${account.department}) for authorization.`,
      request: newRequest,
    };
  }

  // HOD or Admin approves additional program request
  public static approveAdditionalProgramRequest(
    requestId: string,
    approverName: string
  ): { success: boolean; message: string; approvedProgram?: string } {
    const accounts = this.getAccounts();
    let targetAccount: UserAccount | undefined;
    let targetRequest: ProgramAccessRequest | undefined;

    for (const acc of accounts) {
      if (acc.pendingProgramRequests) {
        const req = acc.pendingProgramRequests.find((r) => r.id === requestId);
        if (req) {
          targetAccount = acc;
          targetRequest = req;
          break;
        }
      }
    }

    if (!targetAccount || !targetRequest) {
      return { success: false, message: 'Program authorization request not found.' };
    }

    targetRequest.status = 'APPROVED';
    targetRequest.reviewedBy = approverName;
    targetRequest.reviewedAt = new Date().toISOString();
    targetRequest.rejectionReason = undefined;

    // Add program to assignedPrograms
    const existingPrograms = targetAccount.assignedPrograms || (targetAccount.program ? [targetAccount.program] : []);
    if (!existingPrograms.includes(targetRequest.requestedProgram)) {
      existingPrograms.push(targetRequest.requestedProgram);
    }
    targetAccount.assignedPrograms = existingPrograms;
    if (!targetAccount.program) {
      targetAccount.program = targetRequest.requestedProgram;
    }

    // Set shift assignments for the program
    if (!targetAccount.programShiftAssignments) {
      targetAccount.programShiftAssignments = {};
    }
    targetAccount.programShiftAssignments[targetRequest.requestedProgram] = targetRequest.requestedShifts;

    // Merge shifts into overall assignedShifts
    const currentShifts = new Set<AcademicShift>(targetAccount.assignedShifts || []);
    targetRequest.requestedShifts.forEach((s) => currentShifts.add(s));
    targetAccount.assignedShifts = Array.from(currentShifts);

    this.saveAccounts(accounts);
    FirebaseStore.saveUserAccount(targetAccount).catch(() => {});
    if (typeof window !== 'undefined') {
      fetch(`/api/users/${targetAccount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetAccount),
      }).catch(() => {});
    }

    // Update active session if user is logged in
    const currentSession = this.getCurrentSession();
    if (currentSession && currentSession.id === targetAccount.id) {
      this.setCurrentSession({
        ...currentSession,
        assignedPrograms: targetAccount.assignedPrograms,
        program: targetAccount.program,
        assignedShifts: targetAccount.assignedShifts,
        programShiftAssignments: targetAccount.programShiftAssignments,
        pendingProgramRequests: targetAccount.pendingProgramRequests,
      });
    }

    SecurityService.logSecurityEvent({
      type: 'USER_ROLE_CHANGED',
      severity: 'INFO',
      actor: approverName,
      targetAccount: targetAccount.username,
      details: `HOD/Admin ${approverName} approved additional program access for ${targetAccount.name}: "${targetRequest.requestedProgram}" (${targetRequest.requestedShifts.join(', ')}).`,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mnsuet_auth_changed'));
      window.dispatchEvent(new CustomEvent('mnsuet_accounts_updated'));
    }

    return {
      success: true,
      message: `Approved "${targetRequest.requestedProgram}" for ${targetAccount.name}. Coordinator now has full access to this program!`,
      approvedProgram: targetRequest.requestedProgram,
    };
  }

  // HOD or Admin rejects additional program request
  public static rejectAdditionalProgramRequest(
    requestId: string,
    rejectorName: string,
    reason?: string
  ): { success: boolean; message: string } {
    const accounts = this.getAccounts();
    let targetAccount: UserAccount | undefined;
    let targetRequest: ProgramAccessRequest | undefined;

    for (const acc of accounts) {
      if (acc.pendingProgramRequests) {
        const req = acc.pendingProgramRequests.find((r) => r.id === requestId);
        if (req) {
          targetAccount = acc;
          targetRequest = req;
          break;
        }
      }
    }

    if (!targetAccount || !targetRequest) {
      return { success: false, message: 'Program request not found.' };
    }

    targetRequest.status = 'REJECTED';
    targetRequest.reviewedBy = rejectorName;
    targetRequest.reviewedAt = new Date().toISOString();
    targetRequest.rejectionReason = reason || 'Declined by Head of Department.';

    this.saveAccounts(accounts);
    FirebaseStore.saveUserAccount(targetAccount).catch(() => {});
    if (typeof window !== 'undefined') {
      fetch(`/api/users/${targetAccount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetAccount),
      }).catch(() => {});
    }

    const currentSession = this.getCurrentSession();
    if (currentSession && currentSession.id === targetAccount.id) {
      this.setCurrentSession({
        ...currentSession,
        pendingProgramRequests: targetAccount.pendingProgramRequests,
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mnsuet_auth_changed'));
      window.dispatchEvent(new CustomEvent('mnsuet_accounts_updated'));
    }

    return {
      success: true,
      message: `Additional program request for "${targetRequest.requestedProgram}" was declined.`,
    };
  }

  // Get all pending additional program requests across users in a department (or all)
  public static getPendingProgramRequests(department?: string): ProgramAccessRequest[] {
    const accounts = this.getAccounts();
    const requests: ProgramAccessRequest[] = [];
    accounts.forEach((acc) => {
      if (department && department !== 'ALL' && department !== 'All Departments') {
        if (acc.department.trim().toLowerCase() !== department.trim().toLowerCase()) return;
      }
      if (acc.pendingProgramRequests && acc.pendingProgramRequests.length > 0) {
        acc.pendingProgramRequests.forEach((req) => {
          if (req.status === 'PENDING') {
            requests.push(req);
          }
        });
      }
    });
    return requests;
  }

  // Get all program requests for a specific user (pending, approved, rejected)
  public static getUserProgramRequests(userId: string): ProgramAccessRequest[] {
    const accounts = this.getAccounts();
    const acc = accounts.find((a) => a.id === userId);
    return acc?.pendingProgramRequests || [];
  }

  // Normalize legacy and custom themes
  public static normalizeTheme(theme: string | null | undefined): AppTheme {
    if (!theme) return 'emerald';
    if (theme === 'light') return 'emerald';
    if (theme === 'dark') return 'midnight';
    if (['emerald', 'midnight', 'oxford', 'sunset', 'contrast'].includes(theme)) {
      return theme as AppTheme;
    }
    return 'emerald';
  }

  // Get metadata descriptor for theme
  public static getThemeDefinition(theme: AppTheme): ThemeDefinition {
    const normalized = this.normalizeTheme(theme);
    return INSTITUTIONAL_THEMES.find((t) => t.id === normalized) || INSTITUTIONAL_THEMES[0];
  }

  // Get all available institutional themes
  public static getAvailableThemes(): ThemeDefinition[] {
    return INSTITUTIONAL_THEMES;
  }

  // Initialize theme mode on app boot
  public static initTheme(): AppTheme {
    try {
      const activeSession = this.getCurrentSession();
      const stored = localStorage.getItem('mnsuet_theme_mode');
      const theme = this.normalizeTheme(activeSession?.themePreference || stored);
      this.applyTheme(theme);
      return theme;
    } catch (e) {
      return 'emerald';
    }
  }

  // Retrieve current active theme
  public static getCurrentTheme(): AppTheme {
    if (typeof document !== 'undefined') {
      const current = document.documentElement.getAttribute('data-theme');
      if (current) return this.normalizeTheme(current);
      if (document.documentElement.classList.contains('dark')) return 'midnight';
    }
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('mnsuet_theme_mode') : null;
    return this.normalizeTheme(stored);
  }

  // Apply theme to HTML root element
  public static applyTheme(theme: AppTheme | 'light' | 'dark'): AppTheme {
    const normalized = this.normalizeTheme(theme);
    const def = this.getThemeDefinition(normalized);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', normalized);
      if (def.isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    try {
      localStorage.setItem('mnsuet_theme_mode', normalized);
    } catch (e) {}
    return normalized;
  }

  // Set explicit theme with persistence & user profile sync
  public static setTheme(newTheme: AppTheme | 'light' | 'dark', userId?: string): AppTheme {
    const normalized = this.applyTheme(newTheme);
    const accounts = this.getAccounts();
    const session = this.getCurrentSession();
    const targetId = userId || session?.id;
    if (normalized !== 'midnight') {
      const storageKey = `mnsuet_prev_light_theme_${targetId || 'guest'}`;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(storageKey, normalized);
      }
    }

    if (targetId) {
      const user = accounts.find((a) => a.id === targetId);
      if (user) {
        user.themePreference = normalized;
        this.saveAccounts(accounts);
        FirebaseStore.saveUserAccount(user).catch(() => {});
        if (typeof window !== 'undefined') {
          fetch(`/api/users/${user.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ themePreference: normalized }),
          }).catch(() => {});
        }
      }
      if (session && session.id === targetId) {
        session.themePreference = normalized;
        this.setCurrentSession(session);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('mnsuet_theme_changed', { detail: { theme: normalized } })
      );
    }

    return normalized;
  }

  // Quick toggle between Day and Night
  public static toggleTheme(userId?: string): AppTheme {
    const current = this.getCurrentTheme();

    let newTheme: AppTheme = 'emerald';
    const storageKey = `mnsuet_prev_light_theme_${userId || 'guest'}`;

    if (current === 'midnight') {
      // Going from night back to day. Try to restore previous day theme.
      const prev = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : null;
      if (prev && ['emerald', 'oxford', 'sunset', 'contrast'].includes(prev)) {
        newTheme = prev as AppTheme;
      } else {
        newTheme = 'emerald';
      }
    } else {
      // Going from day to night. Save current day theme.
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(storageKey, current);
      }
      newTheme = 'midnight';
    }

    return this.setTheme(newTheme, userId);
  }

  // Remove all non-master accounts, leaving only official Admin, VC, and Talha Jahangir accounts
  public static clearNonMasterAccounts(): { success: boolean; message: string; count: number } {
    const accounts = this.getAccounts();
    const masters = accounts.filter(
      (a) =>
        a.username.toLowerCase() === 'admin' ||
        a.username.toLowerCase() === 'vc' ||
        a.username.toLowerCase() === 'mtalhajahangir'
    );
    const removedCount = accounts.length - masters.length;
    this.saveAccounts(masters);
    return {
      success: true,
      message: `Cleared ${removedCount} registered user account(s). Official core accounts preserved.`,
      count: removedCount,
    };
  }
}
