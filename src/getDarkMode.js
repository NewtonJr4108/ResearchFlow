import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

export async function getDarkMode(userId) {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return userSnap.data().darkMode || false;
  } else {
    return false;
  }
}
