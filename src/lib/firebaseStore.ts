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
} from 'firebase/firestore';
import { db } from './firebase';
import { SubmissionRecord, WorkOnDemandRequisition, UserAccount, AccessLogEntry } from '../types';

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
    if (!isQuotaExhausted) {
      isQuotaExhausted = true;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(QUOTA_STORAGE_KEY, Date.now().toString());
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('mnsuet_firestore_quota_status', {
              detail: { exhausted: true, message: errMsg },
            })
          );
        }
      } catch (e) {}
    }
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
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('mnsuet_firestore_quota_status', {
            detail: { exhausted },
          })
        );
      }
    } catch (e) {}
  }

  static async testConnection(): Promise<void> {
    if (this.isQuotaExhausted()) return;
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.warn('Please check your Firebase configuration or internet connection.');
      } else {
        handleFirestoreError(error, OperationType.GET, 'test/connection');
      }
    }
  }

  // ---------------------------------------------------------------------------
  // GLOBAL STATE / CONFIGURATION
  // ---------------------------------------------------------------------------
  static async syncGlobalState(key: string, data: any): Promise<void> {
    if (isQuotaExhausted) return;
    try {
      await setDoc(doc(db, 'config', key), { data: data ?? null, updatedAt: new Date().toISOString() });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `config/${key}`);
    }
  }

  static listenGlobalState(key: string, callback: (data: any) => void): () => void {
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
    if (isQuotaExhausted) return;
    try {
      const docRef = doc(db, SYSTEM_DOC);
      await setDoc(docRef, { deadline: isoString, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, SYSTEM_DOC);
    }
  }

  static async setLockdownDisabled(disabled: boolean): Promise<void> {
    if (isQuotaExhausted) return;
    try {
      const docRef = doc(db, SYSTEM_DOC);
      await setDoc(docRef, { lockdownDisabled: disabled, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, SYSTEM_DOC);
    }
  }

  static listenToSystemConfig(callback: (config: any) => void): () => void {
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
    if (isQuotaExhausted) {
      const err = new Error('The Firestore daily write limit has been exceeded. Your submission cannot be saved at this time. Please try again later.');
      err.name = 'QuotaExceededError';
      throw err;
    }
    const docPath = `${RECORDS_COLLECTION}/${record.id}`;
    try {
      const docRef = doc(db, RECORDS_COLLECTION, record.id);
      await setDoc(docRef, record, { merge: true });
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
    if (isQuotaExhausted) return;
    const docPath = `${RECORDS_COLLECTION}/${id}`;
    try {
      const docRef = doc(db, RECORDS_COLLECTION, id);
      await deleteDoc(docRef);
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
      return snapshot.docs.map((docSnap) => docSnap.data() as SubmissionRecord);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, RECORDS_COLLECTION);
      return [];
    }
  }

  static listenToSubmissions(
    callback: (records: Record<string, SubmissionRecord>) => void
  ): () => void {
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
    if (isQuotaExhausted) return;
    try {
      const snapshot = await getDocs(collection(db, RECORDS_COLLECTION));
      const batch = writeBatch(db);
      snapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, RECORDS_COLLECTION);
    }
  }

  // ---------------------------------------------------------------------------
  // USER ACCOUNTS SYNCHRONIZATION
  // ---------------------------------------------------------------------------
  static async saveUserAccount(user: UserAccount): Promise<void> {
    if (isQuotaExhausted) return;
    const docPath = `${USERS_COLLECTION}/${user.id}`;
    try {
      const docRef = doc(db, USERS_COLLECTION, user.id);
      const sanitized = JSON.parse(JSON.stringify(user));
      await setDoc(docRef, sanitized, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, docPath);
    }
  }

  static async deleteUserAccount(id: string): Promise<void> {
    if (isQuotaExhausted) return;
    const docPath = `${USERS_COLLECTION}/${id}`;
    try {
      const docRef = doc(db, USERS_COLLECTION, id);
      await deleteDoc(docRef);
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
      return snapshot.docs.map((docSnap) => docSnap.data() as UserAccount);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, USERS_COLLECTION);
      return [];
    }
  }

  static listenToUserAccounts(callback: (accounts: UserAccount[]) => void): () => void {
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
    if (isQuotaExhausted) return;
    const docPath = `${REQUISITIONS_COLLECTION}/${requisition.id}`;
    try {
      const docRef = doc(db, REQUISITIONS_COLLECTION, requisition.id);
      await setDoc(docRef, JSON.parse(JSON.stringify(requisition)), { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, docPath);
    }
  }

  static async deleteWorkOnDemand(id: string): Promise<void> {
    if (isQuotaExhausted) return;
    const docPath = `${REQUISITIONS_COLLECTION}/${id}`;
    try {
      const docRef = doc(db, REQUISITIONS_COLLECTION, id);
      await deleteDoc(docRef);
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
      return snapshot.docs.map((docSnap) => docSnap.data() as WorkOnDemandRequisition);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, REQUISITIONS_COLLECTION);
      return [];
    }
  }

  static listenToWorkOnDemand(callback: (items: WorkOnDemandRequisition[]) => void): () => void {
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
  static async saveAccessLog(log: AccessLogEntry): Promise<void> {
    if (this.isQuotaExhausted()) return;
    const docPath = `${LOGS_COLLECTION}/${log.id}`;
    try {
      const docRef = doc(db, LOGS_COLLECTION, log.id);
      await setDoc(docRef, JSON.parse(JSON.stringify(log)), { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, docPath);
    }
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
    if (isQuotaExhausted) return;
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
