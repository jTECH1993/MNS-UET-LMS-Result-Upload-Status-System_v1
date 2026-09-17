/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCOxfuY32fnlTpYdpp4DJT2CejWm7YMcvg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hrcv-2d7ce.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hrcv-2d7ce",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "hrcv-2d7ce.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "329377738233",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:329377738233:web:0171f48e40cd7571d36128"
};

export const app = initializeApp(firebaseConfig);

// Initialize Firestore
const dbId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-mnsuetlmsresultu-e2136163-8fbb-42d0-a2cb-ea06807df2ce";
export const db = getFirestore(app, dbId);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
  } else if (err.code == 'unimplemented') {
    console.warn('The current browser does not support all of the features required to enable persistence');
  }
});
