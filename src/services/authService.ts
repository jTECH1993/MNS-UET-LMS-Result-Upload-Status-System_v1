import { UserAccount, ActiveUserSession, UserRole } from '../types';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';

const ACCOUNTS_STORAGE_KEY = 'mnsuet_user_accounts_v2';
const ACTIVE_AUTH_SESSION_KEY = 'mnsuet_auth_session_v2';

// Seed default official university accounts (Only official master accounts: Admin & VC)
const DEFAULT_ACCOUNTS: UserAccount[] = [
  {
    id: 'user_admin',
    username: 'admin',
    password: 'Qwe12!@!@',
    name: 'System Administrator',
    designation: 'Director IT / Administrator',
    department: 'Office of the Registrar / IT Directorate',
    role: 'ADMIN',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'user_vc',
    username: 'VC',
    password: 'JHG45$%xz',
    name: 'Prof. Dr. Vice Chancellor',
    designation: 'Vice Chancellor',
    department: 'Office of the Vice Chancellor',
    role: 'VC',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
];

export class AuthService {
  // Retrieve all accounts from localStorage or seed defaults
  public static getAccounts(): UserAccount[] {
    try {
      const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
        return DEFAULT_ACCOUNTS;
      }
      let parsed: UserAccount[] = JSON.parse(raw);

      // Automatically purge legacy dummy test accounts (hod_cs, hod_ee) so system is completely fresh
      let modified = false;
      const initialCount = parsed.length;
      parsed = parsed.filter(
        (a) => a.username.toLowerCase() !== 'hod_cs' && a.username.toLowerCase() !== 'hod_ee'
      );
      if (parsed.length !== initialCount) {
        modified = true;
      }

      // Ensure required Admin and VC accounts always exist
      const adminAcc = parsed.find(
        (a) => a.username.toLowerCase() === 'admin'
      );
      if (!adminAcc) {
        parsed.push({ ...DEFAULT_ACCOUNTS[0] });
        modified = true;
      } else {
        if (!adminAcc.password) {
          adminAcc.password = 'Qwe12!@!@';
          modified = true;
        }
        adminAcc.role = 'ADMIN';
      }

      const vcAcc = parsed.find(
        (a) => a.username.toLowerCase() === 'vc'
      );
      if (!vcAcc) {
        parsed.push({ ...DEFAULT_ACCOUNTS[1] });
        modified = true;
      } else {
        if (!vcAcc.password) {
          vcAcc.password = 'JHG45$%xz';
          modified = true;
        }
        vcAcc.role = 'VC';
      }

      // Automatically normalize Coordinator accounts (e.g. Program Coordinator of BS AI)
      for (const acc of parsed) {
        const isCoord =
          (acc.designation && acc.designation.toLowerCase().includes('coordinator')) ||
          (acc.username && (acc.username.toLowerCase().includes('talha') || acc.username.toLowerCase().includes('coord'))) ||
          (acc.name && acc.name.toLowerCase().includes('talha'));
        
        if (isCoord) {
          if (acc.role === 'HOD') {
            acc.role = 'COORDINATOR';
            modified = true;
          }
          if (!acc.program) {
            acc.program = 'BS Artificial Intelligence';
            modified = true;
          }
        }
      }

      if (modified) {
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(parsed));
      }
      return parsed;
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
        session.department = account.department;
        session.designation = account.designation;
        session.name = account.name;
        session.avatarUrl = account.avatarUrl;
        session.themePreference = account.themePreference;
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

  // Login handler with username (case-insensitive) & password matching
  public static login(
    usernameInput: string,
    passwordInput: string
  ): { success: boolean; message: string; session?: ActiveUserSession } {
    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, message: 'Please enter both username and password.' };
    }

    const accounts = this.getAccounts();
    const account = accounts.find(
      (a) => a.username.trim().toLowerCase() === cleanUser
    );

    if (!account) {
      return {
        success: false,
        message: 'Account not found. Please check username or create a new account.',
      };
    }

    if (account.password !== cleanPass) {
      return {
        success: false,
        message: 'Incorrect password. Please verify and try again.',
      };
    }

    // Update last login timestamp
    account.lastLoginAt = new Date().toISOString();
    this.saveAccounts(accounts);

    const session: ActiveUserSession = {
      id: account.id,
      username: account.username,
      name: account.name,
      designation: account.designation,
      department: account.department,
      role: account.role,
      program: account.program,
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

  // Register a new HOD / Coordinator account
  public static registerAccount(data: {
    username: string;
    password: string;
    name: string;
    department: string;
    designation: string;
    role?: UserRole;
    program?: string;
  }): { success: boolean; message: string; session?: ActiveUserSession } {
    const cleanUser = data.username.trim();
    const cleanPass = data.password.trim();
    const cleanName = data.name.trim();
    const cleanDept = data.department.trim();
    const cleanDesig = data.designation.trim() || 'HOD / Coordinator';
    const assignedRole = data.role || (cleanDesig.toLowerCase().includes('coordinator') ? 'COORDINATOR' : 'HOD');

    if (!cleanUser || !cleanPass || !cleanName || !cleanDept) {
      return { success: false, message: 'All fields are required.' };
    }

    if (cleanPass.length < 4) {
      return { success: false, message: 'Password must be at least 4 characters long.' };
    }

    const accounts = this.getAccounts();
    const existing = accounts.find(
      (a) => a.username.trim().toLowerCase() === cleanUser.toLowerCase()
    );

    if (existing) {
      return {
        success: false,
        message: `An account with username "${cleanUser}" already exists. Please choose a different username.`,
      };
    }

    const newAccount: UserAccount = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUser,
      password: cleanPass,
      name: cleanName,
      department: cleanDept,
      designation: cleanDesig,
      role: assignedRole,
      program: data.program?.trim() || undefined,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    accounts.push(newAccount);
    this.saveAccounts(accounts);

    const session: ActiveUserSession = {
      id: newAccount.id,
      username: newAccount.username,
      name: newAccount.name,
      designation: newAccount.designation,
      department: newAccount.department,
      role: newAccount.role,
      program: newAccount.program,
      token: `auth_tok_${Date.now()}`,
    };

    this.setCurrentSession(session);
    return {
      success: true,
      message: `Account created successfully for ${newAccount.name} (${newAccount.department}).`,
      session,
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

  // Update Profile: Name, Designation, Avatar, Password, Theme, Role, Program, Department
  public static updateProfile(
    userId: string,
    data: {
      name?: string;
      designation?: string;
      avatarUrl?: string;
      oldPassword?: string;
      newPassword?: string;
      themePreference?: 'light' | 'dark';
      role?: UserRole;
      department?: string;
      program?: string;
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
      if (data.oldPassword.trim() !== account.password) {
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
      account.password = data.newPassword.trim();
    }

    // Update name
    if (data.name !== undefined && data.name.trim().length > 0) {
      account.name = data.name.trim();
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
        designation: account.designation,
        department: account.department,
        role: account.role,
        program: account.program,
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

  // Initialize theme mode
  public static initTheme(): 'light' | 'dark' {
    try {
      const activeSession = this.getCurrentSession();
      const stored = localStorage.getItem('mnsuet_theme_mode') as 'light' | 'dark' | null;
      const theme: 'light' | 'dark' = activeSession?.themePreference || stored || 'light';
      this.applyTheme(theme);
      return theme;
    } catch (e) {
      return 'light';
    }
  }

  // Apply theme to HTML root element
  public static applyTheme(theme: 'light' | 'dark'): void {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    try {
      localStorage.setItem('mnsuet_theme_mode', theme);
    } catch (e) {}
  }

  // Toggle theme mode for active user / guest
  public static toggleTheme(userId?: string): 'light' | 'dark' {
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    const newTheme: 'light' | 'dark' = isDark ? 'light' : 'dark';
    this.applyTheme(newTheme);

    const accounts = this.getAccounts();
    const session = this.getCurrentSession();
    const targetId = userId || session?.id;

    if (targetId) {
      const user = accounts.find((a) => a.id === targetId);
      if (user) {
        user.themePreference = newTheme;
        this.saveAccounts(accounts);
      }
      if (session && session.id === targetId) {
        session.themePreference = newTheme;
        this.setCurrentSession(session);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('mnsuet_theme_changed', { detail: { theme: newTheme } })
      );
    }

    return newTheme;
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
