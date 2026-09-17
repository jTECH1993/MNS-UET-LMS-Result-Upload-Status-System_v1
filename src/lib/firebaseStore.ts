import { collection, doc, setDoc, getDoc, getDocs, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { SubmissionRecord, WorkOnDemandRequisition } from '../types';

const RECORDS_COLLECTION = 'records';
const SYSTEM_DOC = 'config/system';

export class FirebaseStore {
  static async syncGlobalState(key: string, data: any) {
    await setDoc(doc(db, 'config', key), { data });
  }

  static listenGlobalState(key: string, callback: (data: any) => void) {
    return onSnapshot(doc(db, 'config', key), (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().data);
      }
    });
  }

  static async saveSubmission(record: SubmissionRecord): Promise<void> {
    const docRef = doc(db, RECORDS_COLLECTION, record.id);
    await setDoc(docRef, record);
  }

  static async deleteSubmission(id: string): Promise<void> {
    const docRef = doc(db, RECORDS_COLLECTION, id);
    await deleteDoc(docRef);
  }

  static async fetchAllSubmissions(): Promise<SubmissionRecord[]> {
    const snapshot = await getDocs(collection(db, RECORDS_COLLECTION));
    return snapshot.docs.map(doc => doc.data() as SubmissionRecord);
  }

  static listenToSubmissions(callback: (records: Record<string, SubmissionRecord>) => void): () => void {
    return onSnapshot(collection(db, RECORDS_COLLECTION), (snapshot) => {
      const records: Record<string, SubmissionRecord> = {};
      snapshot.forEach(doc => {
        records[doc.id] = doc.data() as SubmissionRecord;
      });
      callback(records);
    }, (error) => {
      console.error('Firestore listen error:', error);
    });
  }

  static async setSystemDeadline(isoString: string | null): Promise<void> {
    const docRef = doc(db, SYSTEM_DOC);
    await setDoc(docRef, { deadline: isoString }, { merge: true });
  }

  static listenToSystemConfig(callback: (config: any) => void): () => void {
    return onSnapshot(doc(db, SYSTEM_DOC), (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data());
      }
    });
  }
}
