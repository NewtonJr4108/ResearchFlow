import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

export async function getTasks(projectId) {
  try {
    const tasksCol = collection(db, "projects", projectId, "tasks");
    const querySnapshot = await getDocs(tasksCol);

    const tasks = [];
    querySnapshot.forEach(doc => {
      tasks.push({ id: doc.id, ...doc.data() });
    });

    return tasks;
  } catch (e) {
    console.error("Error getting tasks:", e);
    return [];
  }
}
