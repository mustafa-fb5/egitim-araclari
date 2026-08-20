import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCdwKO9xVpD5YStcT9fv07CoWvp6hwglSI",
  authDomain: "egitim-araclari.firebaseapp.com",
  projectId: "egitim-araclari",
  storageBucket: "egitim-araclari.firebasestorage.app",
  messagingSenderId: "20702126092",
  appId: "1:20702126092:web:e1c408bc8e37c7f9904e29"
};

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore - memoryLocalCache kullan (canlıda IndexedDB kilidi sorununu önler)
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: memoryLocalCache(),
  });
} catch {
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;
export const auth = getAuth(app);
export default app;
