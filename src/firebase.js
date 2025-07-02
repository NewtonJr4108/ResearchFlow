import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { setPersistence, browserLocalPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAixXnIchht0tJkMjSf7rTFOhRYa23NUPQ",
  authDomain: "researchflow-4e70d.firebaseapp.com",
  projectId: "researchflow-4e70d",
  storageBucket: "researchflow-4e70d.firebasestorage.app",
  messagingSenderId: "771069232760",
  appId: "1:771069232760:web:56b0b9a73d1e8f068a8f8d"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

setPersistence(auth, browserLocalPersistence);

