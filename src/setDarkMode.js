import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";

export async function setDarkMode(userId, value) {
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, { darkMode: value }, { merge: true });
}
