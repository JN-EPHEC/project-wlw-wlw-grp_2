// Votre fichier principal (ex: firebase.js)

// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// --- CHANGEMENT ICI ---
// On importe la configuration depuis le fichier firebase_env
import { firebaseConfig } from "./firebase_env"; 

// Initialize Firebase
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Export Authentication, Firestore Database and Storage
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;