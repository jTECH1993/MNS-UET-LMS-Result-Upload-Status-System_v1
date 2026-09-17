import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCOxfuY32fnlTpYdpp4DJT2CejWm7YMcvg",
  authDomain: "hrcv-2d7ce.firebaseapp.com",
  projectId: "hrcv-2d7ce",
  storageBucket: "hrcv-2d7ce.firebasestorage.app",
  messagingSenderId: "329377738233",
  appId: "1:329377738233:web:0171f48e40cd7571d36128"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function wipe() {
    console.log('Fetching records...');
    const snap = await getDocs(collection(db, 'records'));
    let count = 0;
    for (const doc of snap.docs) {
        await deleteDoc(doc.ref);
        count++;
    }
    console.log(`Deleted ${count} records from Firebase.`);
    process.exit(0);
}
wipe();
