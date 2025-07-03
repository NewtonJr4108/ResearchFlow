import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";


export async function getUserProjects(userId) {
  try {
    const q = collection(db, "users", userId, "projects");
    const querySnapshot = await getDocs(q);

    const projects = [];
    querySnapshot.forEach(doc => {
      projects.push({ id: doc.id, ...doc.data() });
    });

    return projects;
  } catch (e) {
    console.error("Error getting projects:", e);
    return [];
  }
}
