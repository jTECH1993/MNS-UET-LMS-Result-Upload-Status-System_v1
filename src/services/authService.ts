import bcrypt from 'bcryptjs';
import { UserAccount, ActiveUserSession, UserRole, AppTheme, AcademicShift } from '../types';
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
        if (!cloudAccounts || cloudAccounts.length === 0) return;
        const localAccounts = this.getAccounts();
        let changed = false;

        const mergedMap = new Map<string, UserAccount>();
        localAccounts.forEach((acc) => mergedMap.set(acc.id, acc));

        cloudAccounts.forEach((remoteAcc) => {
          const existing = mergedMap.get(remoteAcc.id);
          if (!existing) {
            mergedMap.set(remoteAcc.id, remoteAcc);
            changed = true;
          } else if (
            remoteAcc.lastLoginAt !== existing.lastLoginAt ||
            remoteAcc.password !== existing.password ||
            remoteAcc.name !== existing.name ||
            remoteAcc.designation !== existing.designation ||
            remoteAcc.department !== existing.department ||
            remoteAcc.role !== existing.role ||
            remoteAcc.program !== existing.program ||
            JSON.stringify(remoteAcc.assignedPrograms) !== JSON.stringify(existing.assignedPrograms) ||
            JSON.stringify(remoteAcc.assignedShifts) !== JSON.stringify(existing.assignedShifts) ||
            remoteAcc.avatarUrl !== existing.avatarUrl ||
            remoteAcc.themePreference !== existing.themePreference ||
            remoteAcc.email !== existing.email
          ) {
            mergedMap.set(remoteAcc.id, { ...existing, ...remoteAcc });
            changed = true;
          }
        });

        if (changed) {
          const mergedList = Array.from(mergedMap.values());
          this.saveAccounts(mergedList);
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
        message: `Institutional policy: Only ONE account is permitted per institutional email address (${cleanEmail}). Each faculty member holds a single account. A single login enables you to coordinate multiple degree programs and oversee both Morning & Evening shifts directly from your portal without needing multiple accounts. Please log in with your existing account.`,
      };
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
      details: `New account registered and database synchronized: ${newAccount.username} (${newAccount.email}) [${newAccount.role} - ${newAccount.department}]. Programs: ${newAccount.assignedPrograms?.join(', ') || newAccount.program || 'None'}. Shifts: ${newAccount.assignedShifts?.join(', ') || 'Default'}.`,
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
      token: `auth_tok_${Date.now()}`,
    };

    this.setCurrentSession(session);
    return {
      success: true,
      message: `Account created and synced in university database successfully for ${newAccount.name} (${newAccount.department}).`,
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

    // Update avatarUrl (can be empty string to remove avatar)
    if (data.avatarUrl !== undefined) {
      account.avatarUrl = data.avatarUrl.trim();
    }

    // Update themePreference
    if (data.themePreference) {
      account.themePreference = data.themePreference;
      this.applyTheme(data.themePreference);
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
