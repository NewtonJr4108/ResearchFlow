import { db } from "./firebase";
import { doc, deleteDoc } from "firebase/firestore";

export async function deleteProject(projectId) {
  try {
    await deleteDoc(doc(db, "projects", projectId));
    console.log("Project deleted:", projectId);
  } catch (e) {
    console.error("Error deleting project:", e);
  }
}
