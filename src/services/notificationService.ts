import { FirebaseStore } from '../lib/firebaseStore';
import { AuditTrailService } from './auditTrailService';

export type TargetAudienceType = 'ALL_DEPARTMENT' | 'ALL_PROGRAM' | 'SPECIFIC_ROLE' | 'INDIVIDUAL_MEMBER';

export interface FacultyReminderNotification {
  id: string;
  senderId?: string;
  senderName: string;
  senderRole: 'HOD' | 'COORDINATOR' | 'ADMIN' | 'VC';
  department: string;
  program: string;
  shift?: string;
  session?: string;
  semester?: string;
  section?: string;
  title: string;
  message: string;
  deadline?: string;
  createdAt: string;
  active: boolean;
  dismissedBy?: string[]; // List of user IDs or emails

  // Target Recipient Audience Parameters
  targetAudienceType?: TargetAudienceType;
  targetUserId?: string;
  targetUserName?: string;
  targetUserEmail?: string;
  targetRole?: string;
}

const STORAGE_KEY = 'mnsuet_faculty_reminder_notifications_v1';

export class NotificationService {
  private static isInitialized = false;

  public static init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Listen to Firebase real-time updates for global faculty reminders
    FirebaseStore.listenGlobalState(STORAGE_KEY, (data) => {
      if (data && Array.isArray(data)) {
        const current = localStorage.getItem(STORAGE_KEY);
        const newStr = JSON.stringify(data);
        if (current !== newStr) {
          localStorage.setItem(STORAGE_KEY, newStr);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mnsuet_reminder_updated'));
          }
        }
      }
    });
  }

  public static getReminders(): FacultyReminderNotification[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Filter out legacy fake seed reminders
          const cleanReminders = parsed.filter((r) => r.id !== 'rem-seed-1');
          if (cleanReminders.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanReminders));
          }
          return cleanReminders;
        }
      }
    } catch (e) {
      console.error('Failed to parse faculty reminders', e);
    }

    return [];
  }

  public static dispatchReminder(reminderData: {
    senderId?: string;
    senderName: string;
    senderRole: 'HOD' | 'COORDINATOR' | 'ADMIN' | 'VC';
    department: string;
    program: string;
    shift?: string;
    session?: string;
    semester?: string;
    section?: string;
    title: string;
    message: string;
    deadline?: string;

    targetAudienceType?: TargetAudienceType;
    targetUserId?: string;
    targetUserName?: string;
    targetUserEmail?: string;
    targetRole?: string;
  }): FacultyReminderNotification {
    this.init();
    const reminders = this.getReminders();

    const newReminder: FacultyReminderNotification = {
      id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      active: true,
      dismissedBy: [],
      ...reminderData,
    };

    const updated = [newReminder, ...reminders].slice(0, 50);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    if (!FirebaseStore.isQuotaExhausted()) {
      try {
        FirebaseStore.syncGlobalState(STORAGE_KEY, updated).catch(() => {});
      } catch (e) {}
    }

    // Dispatch audit trail entry
    AuditTrailService.logChange({
      action: 'APPROVED',
      actorId: reminderData.senderId,
      actorName: reminderData.senderName,
      actorRole: reminderData.senderRole,
      department: reminderData.department,
      program: reminderData.program,
      shift: reminderData.shift,
      semester: reminderData.semester,
      section: reminderData.section,
      summary: `Dispatched system-wide faculty reminder notification: "${reminderData.title}"`,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mnsuet_reminder_updated', { detail: newReminder }));
    }

    return newReminder;
  }

  public static dismissReminder(reminderId: string, userId: string): void {
    if (!reminderId || !userId) return;
    const reminders = this.getReminders();
    const updated = reminders.map((r) => {
      if (r.id === reminderId) {
        const dismissed = r.dismissedBy || [];
        if (!dismissed.includes(userId)) {
          return { ...r, dismissedBy: [...dismissed, userId] };
        }
      }
      return r;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    if (!FirebaseStore.isQuotaExhausted()) {
      try {
        FirebaseStore.syncGlobalState(STORAGE_KEY, updated).catch(() => {});
      } catch (e) {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mnsuet_reminder_updated'));
    }
  }

  public static deleteReminder(reminderId: string): void {
    const reminders = this.getReminders();
    const updated = reminders.filter((r) => r.id !== reminderId);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    if (!FirebaseStore.isQuotaExhausted()) {
      try {
        FirebaseStore.syncGlobalState(STORAGE_KEY, updated).catch(() => {});
      } catch (e) {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mnsuet_reminder_updated'));
    }
  }

  public static listen(callback: () => void): () => void {
    this.init();
    if (typeof window === 'undefined') return () => {};

    const handler = () => callback();
    window.addEventListener('mnsuet_reminder_updated', handler);
    return () => {
      window.removeEventListener('mnsuet_reminder_updated', handler);
    };
  }
}

// Auto init
NotificationService.init();
