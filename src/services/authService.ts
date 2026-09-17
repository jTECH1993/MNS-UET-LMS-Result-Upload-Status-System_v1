import bcrypt from 'bcryptjs';
import { UserAccount, ActiveUserSession, UserRole, AppTheme } from '../types';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import { SecurityService } from './securityService';

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

const ACCOUNTS_STORAGE_KEY = 'mnsuet_user_accounts_v99';
const ACTIVE_AUTH_SESSION_KEY = 'mnsuet_auth_session_v99';

// Seed default official university accounts (Master accounts: Admin, VC, & Coordinator)
const DEFAULT_ACCOUNTS: UserAccount[] = [
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
    createdAt: '2026-09-01T08:00:00.000Z',
  },
];

const SecurityHelper = {
  isHashed: (str: string) => str.startsWith('$2a$') || str.startsWith('$2b$') || str.startsWith('$2y$'),
  verifyPassword: (input: string, stored: string) => {
    if (SecurityHelper.isHashed(stored)) {
      return bcrypt.compareSync(input, stored);
    }
    return input === stored;
  },
  hashPassword: (input: string) => {
    return bcrypt.hashSync(input, 10);
  }
};

export class AuthService {
  public static getAccounts(): UserAccount[] {

    try {
      const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (!raw) {
        return DEFAULT_ACCOUNTS;
      }
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Error reading accounts, using defaults', e);
      return DEFAULT_ACCOUNTS;
    }
  }

  // Save updated accounts array
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
    // Allow login via username OR registered email address
    const account = accounts.find(
      (a) =>
        a.username.trim().toLowerCase() === cleanUser ||
        (a.email && a.email.trim().toLowerCase() === cleanUser)
    );

    if (!account) {
      SecurityService.recordFailedLogin(cleanUser);
      return {
        success: false,
        message: 'Account not found. Please verify your credentials or register an account.',
      };
    }

    // Verify password
    if (!SecurityHelper.verifyPassword(cleanPass, account.password)) {
      const failResult = SecurityService.recordFailedLogin(account.username);
      if (failResult.isLocked) {
        return {
          success: false,
          message: `Security Lockout Triggered: 5 failed attempts detected. This account has been locked for 5 minutes.`,
          isLocked: true,
          remainingSeconds: failResult.remainingSeconds,
        };
      }
      return {
        success: false,
        message: `Incorrect password. ${failResult.remainingAttempts} attempt(s) remaining before account lockout.`,
      };
    }

    // Successful login: reset failed attempts & log security event
    SecurityService.resetFailedLogin(account.username);
    SecurityService.logSecurityEvent({
      type: 'LOGIN_SUCCESS',
      severity: 'INFO',
      actor: account.username,
      targetAccount: account.username,
      details: `Successful sign-in as ${account.role} (${account.name}).`,
    });

    // Auto-upgrade plaintext passwords
    if (!SecurityHelper.isHashed(account.password)) {
      account.password = SecurityHelper.hashPassword(cleanPass);
    }
    // Update last login timestamp
    account.lastLoginAt = new Date().toISOString();
    this.saveAccounts(accounts);

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

  // Register a new HOD / Coordinator account with security checks
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
  }): { success: boolean; message: string; session?: ActiveUserSession } {
    const cleanUser = SecurityService.sanitizeInput(data.username).trim();
    const cleanEmail = SecurityService.sanitizeInput(data.email || '').trim().toLowerCase();
    const cleanPass = data.password.trim();
    const cleanName = SecurityService.sanitizeInput(data.name).trim();
    const cleanDept = SecurityService.sanitizeInput(data.department).trim();
    const cleanDesig = SecurityService.sanitizeInput(data.designation).trim() || 'HOD / Coordinator';
    const assignedRole = data.role || (cleanDesig.toLowerCase().includes('coordinator') ? 'COORDINATOR' : 'HOD');

    if (!cleanUser || !cleanPass || !cleanName || !cleanDept || !cleanEmail) {
      return { success: false, message: 'All fields are required, including your official email address.' };
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return { success: false, message: 'Please enter a valid email address (e.g. user@mnsuet.edu.pk).' };
    }

    // Password strength check
    const strength = SecurityService.validatePasswordStrength(cleanPass);
    if (!strength.isValid) {
      return { success: false, message: strength.message };
    }

    const accounts = this.getAccounts();
    const existingUser = accounts.find(
      (a) => a.username.trim().toLowerCase() === cleanUser.toLowerCase()
    );

    if (existingUser) {
      return {
        success: false,
        message: `An account with username "${cleanUser}" already exists. Please choose a different username.`,
      };
    }

    const existingEmail = accounts.find(
      (a) => a.email && a.email.trim().toLowerCase() === cleanEmail
    );
    if (existingEmail) {
      return {
        success: false,
        message: `An account with email "${cleanEmail}" is already registered. You can sign in or use "Forgot Password".`,
      };
    }

    const rawAssigned = data.assignedPrograms && data.assignedPrograms.length > 0
      ? data.assignedPrograms.map((p) => SecurityService.sanitizeInput(p).trim()).filter(Boolean)
      : data.program
      ? [SecurityService.sanitizeInput(data.program).trim()]
      : [];

    const primaryProgram = rawAssigned[0] || (data.program ? SecurityService.sanitizeInput(data.program).trim() : undefined);

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
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    accounts.push(newAccount);
    this.saveAccounts(accounts);

    SecurityService.logSecurityEvent({
      type: 'LOGIN_SUCCESS',
      severity: 'INFO',
      actor: newAccount.username,
      targetAccount: newAccount.username,
      details: `New account registered: ${newAccount.username} (${newAccount.email}) [${newAccount.role} - ${newAccount.department}]. Programs: ${newAccount.assignedPrograms?.join(', ') || newAccount.program || 'None'}.`,
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
      token: `auth_tok_${Date.now()}`,
    };

    this.setCurrentSession(session);
    return {
      success: true,
      message: `Account created successfully for ${newAccount.name} (${newAccount.department}).`,
      session,
    };
  }

  // ---------------------------------------------------------------------------
  // PASSWORD RECOVERY / FORGOT PASSWORD SYSTEM
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
      return { success: false, message: 'Please enter your registered email address.' };
    }

    if (!clean.includes('@')) {
      return {
        success: false,
        message: 'Email address is compulsory for password recovery. Please enter your valid registered email (e.g. name@mnsuet.edu.pk).',
      };
    }

    const accounts = this.getAccounts();
    const cleanLower = clean.toLowerCase();

    // Must match registered account's email or username (if username is an email or matches)
    let account = accounts.find(
      (a) => a.email && a.email.trim().toLowerCase() === cleanLower
    );
    if (!account) {
      account = accounts.find(
        (a) => a.username.trim().toLowerCase() === cleanLower
      );
    }
    if (!account) {
      const userPrefix = cleanLower.split('@')[0];
      account = accounts.find(
        (a) => a.username.trim().toLowerCase() === userPrefix
      );
    }

    if (!account) {
      SecurityService.logSecurityEvent({
        type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        severity: 'WARNING',
        actor: clean,
        details: `Password reset attempted with unregistered email: "${clean}".`,
      });
      return {
        success: false,
        message: 'Incorrect email. Please enter the correct email you used during account registration.',
      };
    }

    const targetEmail = account.email?.trim();
    if (!targetEmail) {
      return {
        success: false,
        message: 'No recovery email associated with this account. Please contact the administrator.',
      };
    }

    const resetData = SecurityService.createPasswordResetRequest({
      accountId: account.id,
      username: account.username,
      email: targetEmail,
    });

    return {
      success: true,
      message: `Password reset verification code dispatched to: ${targetEmail}`,
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
      return { success: false, message: 'Please verify the 6-digit email security code first.' };
    }

    const strength = SecurityService.validatePasswordStrength(newPassword);
    if (!strength.isValid) {
      return { success: false, message: strength.message };
    }

    const accounts = this.getAccounts();
    const account = accounts.find((a) => a.id === req.accountId || a.username.toLowerCase() === req.username.toLowerCase());
    if (!account) {
      return { success: false, message: 'Target account could not be found.' };
    }

    account.password = SecurityHelper.hashPassword(newPassword.trim());
    this.saveAccounts(accounts);
    SecurityService.clearResetRequest();
    SecurityService.resetFailedLogin(account.username);

    SecurityService.logSecurityEvent({
      type: 'PASSWORD_RESET_COMPLETED',
      severity: 'INFO',
      actor: account.username,
      targetAccount: account.username,
      details: `Password successfully updated via verified email recovery token.`,
    });

    return {
      success: true,
      message: `Password successfully updated for ${account.name}! You can now log in with your new password.`,
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
      return { success: false, message: 'Cannot delete core institutional administrative accounts.' };
    }

    const filtered = accounts.filter((a) => a.id !== accountId);
    this.saveAccounts(filtered);
    return { success: true, message: `Account "${target.username}" deleted successfully.` };
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

    // Update email
    if (data.email !== undefined && data.email.trim().length > 0) {
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
        avatarUrl: account.avatarUrl,
        themePreference: account.themePreference,
      };
      this.setCurrentSession(updatedSession);
    }

    return {
      success: true,
      message: 'Profile updated successfully!',
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
    if (normalized !== "midnight") {
      const storageKey = `mnsuet_prev_light_theme_${targetId || "guest"}`;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(storageKey, normalized);
      }
    }
    

    if (targetId) {
      const user = accounts.find((a) => a.id === targetId);
      if (user) {
        user.themePreference = normalized;
        this.saveAccounts(accounts);
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

  // Remove all non-master accounts, leaving only official Admin and VC accounts
  public static clearNonMasterAccounts(): { success: boolean; message: string; count: number } {
    const accounts = this.getAccounts();
    const masters = accounts.filter(
      (a) => a.username.toLowerCase() === 'admin' || a.username.toLowerCase() === 'vc'
    );
    const removedCount = accounts.length - masters.length;
    this.saveAccounts(masters);
    return {
      success: true,
      message: `Cleared ${removedCount} registered user account(s). Only Admin and VC remain.`,
      count: removedCount,
    };
  }
}
