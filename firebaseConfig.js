import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "TON_API_KEY",
  authDomain: "swipeskills-cf784.firebaseapp.com",
  projectId: "swipeskills-cf784",
  storageBucket: "swipeskills-cf784.firebasestorage.app",
  messagingSenderId: "TON_MESSAGING_SENDER_ID",
  appId: "TON_APP_ID"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Exporter Authentication, Database ET Storage
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);