import { db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export async function getDarkMode(userId) {
  try {
    const docRef = doc(db, "settings", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().darkMode || false;
    }
    return false;
  } catch (e) {
    console.error("Error getting dark mode:", e);
    return false;
  }
}

export async function setDarkMode(userId, isDark) {
  try {
    await setDoc(doc(db, "settings", userId), { darkMode: isDark }, { merge: true });
  } catch (e) {
    console.error("Error setting dark mode:", e);
  }
}
