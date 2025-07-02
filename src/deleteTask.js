import { db } from "./firebase";
import { doc, deleteDoc } from "firebase/firestore";

export async function deleteTask(projectId, taskId) {
  try {
    await deleteDoc(doc(db, "projects", projectId, "tasks", taskId));
    console.log("Task deleted:", taskId);
  } catch (e) {
    console.error("Error deleting task:", e);
  }
}
