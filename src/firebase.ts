import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// --- PASTE YOUR CONFIG HERE FROM FIREBASE CONSOLE ---
// Go to Firebase Console -> Project Settings -> General -> Your Apps -> Web (</>)
// If you don't have a Web App there yet, click "Add app", name it "Web Dashboard", and copy these keys.
const firebaseConfig = {
  apiKey: "AIzaSyDNW6vzEGFyg93m1lskRrXu3SdbtwapySg",
  authDomain: "hk-drive-f674c.firebaseapp.com",
  projectId: "hk-drive-f674c",
  storageBucket: "hk-drive-f674c.firebasestorage.app",
  messagingSenderId: "955650698316",
  appId: "1:955650698316:web:a39a850e0cdb0d358c58e9"
};
// ----------------------------------------------------

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);