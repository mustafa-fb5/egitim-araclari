import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCdwKO9xVpD5YStcT9fv07CoWvp6hwglSI",
  authDomain: "egitim-araclari.firebaseapp.com",
  projectId: "egitim-araclari",
  storageBucket: "egitim-araclari.firebasestorage.app",
  messagingSenderId: "20702126092",
  appId: "1:20702126092:web:e1c408bc8e37c7f9904e29"
};

// Initialize Firebase (singleton instance)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;
