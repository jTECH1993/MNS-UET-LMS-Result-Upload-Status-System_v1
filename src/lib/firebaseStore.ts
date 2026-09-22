import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  deleteDoc,
  writeBatch,
  getDocFromServer,
  disableNetwork,
  enableNetwork,
} from 'firebase/firestore';
import { db } from './firebase';
import { SubmissionRecord, WorkOnDemandRequisition, UserAccount, AccessLogEntry } from '../types';
import { FirestoreUsageService } from '../services/firestoreUsageService';

const RECORDS_COLLECTION = 'records';
const USERS_COLLECTION = 'users';
const REQUISITIONS_COLLECTION = 'requisitions';
const LOGS_COLLECTION = 'logs';
const SYSTEM_DOC = 'config/system';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

const QUOTA_STORAGE_KEY = 'mnsuet_firestore_quota_exhausted_v1';

function checkInitialQuotaExhaustion(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (!raw) return false;
    const timestamp = parseInt(raw, 10);
    // Quota resets at 00:00 Pacific Time daily (within ~20 hours)
    if (Date.now() - timestamp < 20 * 60 * 60 * 1000) {
      return true;
    }
  } catch (e) {}
  return false;
}

let isQuotaExhausted = checkInitialQuotaExhaustion();

// If quota is known to be exhausted on startup, disable network immediately
// to prevent the Firestore client SDK from attempting to open write streams or looping
if (isQuotaExhausted) {
  try {
    disableNetwork(db).catch(() => {});
  } catch (e) {}
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): boolean {
  const errMsg = error instanceof Error ? error.message : String(error);
  const lowerMsg = errMsg.toLowerCase();

  if (
    lowerMsg.includes('resource-exhausted') ||
    lowerMsg.includes('write stream exhausted') ||
    lowerMsg.includes('maximum allowed queued writes') ||
    lowerMsg.includes('quota limit exceeded') ||
    lowerMsg.includes('quota exceeded') ||
    lowerMsg.includes('quota') ||
    errMsg.includes('429')
  ) {
    FirebaseStore.setQuotaExhausted(true);
    return true;
  }

  if (
    errMsg.includes('Could not reach Cloud Firestore') ||
    errMsg.includes('backend') ||
    errMsg.includes('offline') ||
    errMsg.includes('unavailable') ||
    errMsg.includes('deadline-exceeded') ||
    errMsg.includes('failed to get document') ||
    errMsg.includes('maximum backoff delay')
  ) {
    // Offline or high-latency network connection: Firestore automatically operates in offline cache mode.
    return false;
  }
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    operationType,
    path,
  };
  console.warn('Firestore Operation Info: ', JSON.stringify(errInfo));
  return false;
}

// Global interceptors to catch repeating internal Firestore stream retry loops
if (typeof window !== 'undefined') {
  const isQuotaRelated = (msg: string) => {
    const lower = (msg || '').toLowerCase();
    return (
      lower.includes('resource-exhausted') ||
      lower.includes('quota limit exceeded') ||
      lower.includes('quota exceeded') ||
      lower.includes('using maximum backoff delay') ||
      lower.includes('write stream exhausted')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.message : String(reason);
    if (isQuotaRelated(msg)) {
      FirebaseStore.setQuotaExhausted(true);
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || (event.error instanceof Error ? event.error.message : '');
    if (isQuotaRelated(msg)) {
      FirebaseStore.setQuotaExhausted(true);
      event.preventDefault();
    }
  });

  // Intercept repeating console.error logs originating from @firebase/firestore's backoff retry loop
  const origConsoleError = console.error;
  console.error = function (...args: any[]) {
    const fullText = args
      .map((a) => (typeof a === 'object' ? (a?.message || a?.stack || JSON.stringify(a)) : String(a)))
      .join(' ');
    if (isQuotaRelated(fullText)) {
      FirebaseStore.setQuotaExhausted(true);
      // Suppress noisy repeating retry loop messages from flooding console
      return;
    }
    origConsoleError.apply(console, args);
  };
}

export class FirebaseStore {
  static isQuotaExhausted(): boolean {
    if (isQuotaExhausted) return true;
    isQuotaExhausted = checkInitialQuotaExhaustion();
    return isQuotaExhausted;
  }

  static setQuotaExhausted(exhausted: boolean = true): void {
    isQuotaExhausted = exhausted;
    try {
      if (typeof localStorage !== 'undefined') {
        if (exhausted) {
          localStorage.setItem(QUOTA_STORAGE_KEY, Date.now().toString());
        } else {
          localStorage.removeItem(QUOTA_STORAGE_KEY);
        }
      }
      if (exhausted) {
        // Stop Firestore WriteStream from endless reconnect loops
        disableNetwork(db).catch(() => {});
        FirestoreUsageService.recordOperation('WRITE', 'records', 0, 'Firestore Daily Quota Reached (Circuit Breaker Activated)', 'CIRCUIT_BREAKER_BLOCKED');
      } else {
        enableNetwork(db).catch(() => {});
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('mnsuet_firestore_quota_status', {
            detail: { exhausted },
          })
        );
      }
    } catch (e) {}
  }

  static async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      await enableNetwork(db);
      await getDocFromServer(doc(db, 'test', 'connection'));
      this.setQuotaExhausted(false);
      return { success: true };
    } catch (error: any) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const isQuota = handleFirestoreError(error, OperationType.GET, 'test/connection');
      if (isQuota || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource-exhausted')) {
        this.setQuotaExhausted(true);
        return { success: false, message: 'Cloud Firestore quota is still reached for today. System remains in safe Local/SQLite mode.' };
      }
      return { success: false, message: errMsg };
    }
  }

  // ---------------------------------------------------------------------------
  // GLOBAL STATE / CONFIGURATION
  // ---------------------------------------------------------------------------
  static async syncGlobalState(key: string, data: any): Promise<void> {
    if (this.isQuotaExhausted()) return;
    try {
      await setDoc(doc(db, 'config', key), { data: data ?? null, updatedAt: new Date().toISOString() });
      FirestoreUsageService.recordOperation('WRITE', 'config', 1, `Global State: ${key}`);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `config/${key}`);
    }
  }

  static listenGlobalState(key: string, callback: (data: any) => void): () => void {
    if (this.isQuotaExhausted()) return () => {};
    return onSnapshot(
      doc(db, 'config', key),
      (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data()?.data);
        } else {
          callback(undefined);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `config/${key}`);
      }
    );
  }

  static async setSystemDeadline(isoString: string | null): Promise<void> {
    if (this.isQuotaExhausted()) return;
    try {
      const docRef = doc(db, SYSTEM_DOC);
      await setDoc(docRef, { deadline: isoString, updatedAt: new Date().toISOString() }, { merge: true });
      FirestoreUsageService.recordOperation('WRITE', 'config', 1, 'Deadline Configuration');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, SYSTEM_DOC);
    }
  }

  static async setLockdownDisabled(disabled: boolean): Promise<void> {
    if (this.isQuotaExhausted()) return;
    try {
      const docRef = doc(db, SYSTEM_DOC);
      await setDoc(docRef, { lockdownDisabled: disabled, updatedAt: new Date().toISOString() }, { merge: true });
      FirestoreUsageService.recordOperation('WRITE', 'config', 1, 'Lockdown Mode Toggle');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, SYSTEM_DOC);
    }
  }

  static listenToSystemConfig(callback: (config: any) => void): () => void {
    if (this.isQuotaExhausted()) return () => {};
    return onSnapshot(
      doc(db, SYSTEM_DOC),
      (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data());
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, SYSTEM_DOC);
      }
    );
  }

  // ---------------------------------------------------------------------------
  // SUBMISSION RECORDS
  // ---------------------------------------------------------------------------
  static async saveSubmission(record: SubmissionRecord): Promise<void> {
    if (this.isQuotaExhausted()) {
      const err = new Error('The Firestore daily write limit has been exceeded. Your submission cannot be saved at this time. Please try again later.');
      err.name = 'QuotaExceededError';
      throw err;
    }
    const docPath = `${RECORDS_COLLECTION}/${record.id}`;
    try {
      const docRef = doc(db, RECORDS_COLLECTION, record.id);
      await setDoc(docRef, record, { merge: true });
      FirestoreUsageService.recordOperation('WRITE', 'records', 1, `${record.department} - ${record.program} (${record.session})`);
    } catch (e) {
      const isQuota = handleFirestoreError(e, OperationType.WRITE, docPath);
      if (isQuota || isQuotaExhausted) {
        const err = new Error('The Firestore daily write limit has been exceeded. Your submission cannot be saved at this time. Please try again later.');
        err.name = 'QuotaExceededError';
        throw err;
      }
    }
  }

  static async deleteSubmission(id: string): Promise<void> {
    if (this.isQuotaExhausted()) return;
    const docPath = `${RECORDS_COLLECTION}/${id}`;
    try {
      const docRef = doc(db, RECORDS_COLLECTION, id);
      await deleteDoc(docRef);
      FirestoreUsageService.recordOperation('DELETE', 'records', 1, `Deleted record: ${id}`);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, docPath);
    }
  }

  static async fetchAllSubmissions(): Promise<SubmissionRecord[]> {
    if (this.isQuotaExhausted()) return [];
    try {
      const fetchPromise = getDocs(collection(db, RECORDS_COLLECTION));
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore fetch timeout')), 3000)
      );
      const snapshot = await Promise.race([fetchPromise, timeoutPromise]);
      const count = snapshot.docs.length;
      if (count > 0) {
        FirestoreUsageService.recordOperation('READ', 'records', count, 'Fetch all academic records');
      }
      return snapshot.docs.map((docSnap) => docSnap.data() as SubmissionRecord);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, RECORDS_COLLECTION);
      return [];
    }
  }

  static listenToSubmissions(
    callback: (records: Record<string, SubmissionRecord>) => void
  ): () => void {
    if (this.isQuotaExhausted()) return () => {};
    return onSnapshot(
      collection(db, RECORDS_COLLECTION),
      (snapshot) => {
        const records: Record<string, SubmissionRecord> = {};
        snapshot.forEach((docSnap) => {
          records[docSnap.id] = docSnap.data() as SubmissionRecord;
        });
        callback(records);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, RECORDS_COLLECTION);
      }
    );
  }

  static async wipeAllSubmissions(): Promise<void> {
    if (this.isQuotaExhausted()) return;
    try {
      const snapshot = await getDocs(collection(db, RECORDS_COLLECTION));
      const batch = writeBatch(db);
      snapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      FirestoreUsageService.recordOperation('DELETE', 'records', snapshot.size, 'Wipe all submission documents');
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, RECORDS_COLLECTION);
    }
  }

  // ---------------------------------------------------------------------------
  // USER ACCOUNTS SYNCHRONIZATION
  // ---------------------------------------------------------------------------
  static async saveUserAccount(user: UserAccount): Promise<void> {
    if (this.isQuotaExhausted()) return;
    const docPath = `${USERS_COLLECTION}/${user.id}`;
    try {
      const docRef = doc(db, USERS_COLLECTION, user.id);
      const sanitized = JSON.parse(JSON.stringify(user));
      await setDoc(docRef, sanitized, { merge: true });
      FirestoreUsageService.recordOperation('WRITE', 'users', 1, `User Account: ${user.username} (${user.role})`);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, docPath);
    }
  }

  static async deleteUserAccount(id: string): Promise<void> {
    if (this.isQuotaExhausted()) return;
    const docPath = `${USERS_COLLECTION}/${id}`;
    try {
      const docRef = doc(db, USERS_COLLECTION, id);
      await deleteDoc(docRef);
      FirestoreUsageService.recordOperation('DELETE', 'users', 1, `Deleted user ID: ${id}`);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, docPath);
    }
  }

  static async fetchAllUserAccounts(): Promise<UserAccount[]> {
    if (this.isQuotaExhausted()) return [];
    try {
      const fetchPromise = getDocs(collection(db, USERS_COLLECTION));
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore fetch timeout')), 3000)
      );
      const snapshot = await Promise.race([fetchPromise, timeoutPromise]);
      const count = snapshot.docs.length;
      if (count > 0) {
        FirestoreUsageService.recordOperation('READ', 'users', count, 'Fetch user accounts roster');
      }
      return snapshot.docs.map((docSnap) => docSnap.data() as UserAccount);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, USERS_COLLECTION);
      return [];
    }
  }

  static listenToUserAccounts(callback: (accounts: UserAccount[]) => void): () => void {
    if (this.isQuotaExhausted()) return () => {};
    return onSnapshot(
      collection(db, USERS_COLLECTION),
      (snapshot) => {
        const accounts: UserAccount[] = [];
        snapshot.forEach((docSnap) => {
          accounts.push(docSnap.data() as UserAccount);
        });
        callback(accounts);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, USERS_COLLECTION);
      }
    );
  }

  // ---------------------------------------------------------------------------
  // WORK ON DEMAND REQUISITIONS
  // ---------------------------------------------------------------------------
  static async saveWorkOnDemand(requisition: WorkOnDemandRequisition): Promise<void> {
    if (this.isQuotaExhausted()) return;
    const docPath = `${REQUISITIONS_COLLECTION}/${requisition.id}`;
    try {
      const docRef = doc(db, REQUISITIONS_COLLECTION, requisition.id);
      await setDoc(docRef, JSON.parse(JSON.stringify(requisition)), { merge: true });
      FirestoreUsageService.recordOperation('WRITE', 'requisitions', 1, `Requisition: ${requisition.moduleName}`);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, docPath);
    }
  }

  static async deleteWorkOnDemand(id: string): Promise<void> {
    if (this.isQuotaExhausted()) return;
    const docPath = `${REQUISITIONS_COLLECTION}/${id}`;
    try {
      const docRef = doc(db, REQUISITIONS_COLLECTION, id);
      await deleteDoc(docRef);
      FirestoreUsageService.recordOperation('DELETE', 'requisitions', 1, `Deleted Requisition: ${id}`);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, docPath);
    }
  }

  static async fetchAllWorkOnDemand(): Promise<WorkOnDemandRequisition[]> {
    if (this.isQuotaExhausted()) return [];
    try {
      const fetchPromise = getDocs(collection(db, REQUISITIONS_COLLECTION));
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore fetch timeout')), 3000)
      );
      const snapshot = await Promise.race([fetchPromise, timeoutPromise]);
      const count = snapshot.docs.length;
      if (count > 0) {
        FirestoreUsageService.recordOperation('READ', 'requisitions', count, 'Fetch work requisitions');
      }
      return snapshot.docs.map((docSnap) => docSnap.data() as WorkOnDemandRequisition);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, REQUISITIONS_COLLECTION);
      return [];
    }
  }

  static listenToWorkOnDemand(callback: (items: WorkOnDemandRequisition[]) => void): () => void {
    if (this.isQuotaExhausted()) return () => {};
    return onSnapshot(
      collection(db, REQUISITIONS_COLLECTION),
      (snapshot) => {
        const items: WorkOnDemandRequisition[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as WorkOnDemandRequisition);
        });
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, REQUISITIONS_COLLECTION);
      }
    );
  }

  // ---------------------------------------------------------------------------
  // AUDIT & ACCESS LOGS
  // ---------------------------------------------------------------------------
  static async saveAccessLog(_log: AccessLogEntry): Promise<void> {
    // Access logs are maintained in Local Storage & SQLite backend to conserve Firestore daily quota
    return;
  }

  static async fetchRecentAccessLogs(limitCount = 50): Promise<AccessLogEntry[]> {
    if (this.isQuotaExhausted()) return [];
    try {
      const fetchPromise = getDocs(collection(db, LOGS_COLLECTION));
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore fetch timeout')), 3000)
      );
      const snapshot = await Promise.race([fetchPromise, timeoutPromise]);
      const logs = snapshot.docs.map((docSnap) => docSnap.data() as AccessLogEntry);
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return logs.slice(0, limitCount);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, LOGS_COLLECTION);
      return [];
    }
  }

  static async wipeAllAccessLogs(): Promise<void> {
    if (this.isQuotaExhausted()) return;
    try {
      const snapshot = await getDocs(collection(db, LOGS_COLLECTION));
      const batch = writeBatch(db);
      snapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, LOGS_COLLECTION);
    }
  }
}

