import { db } from "./firebase";
import { doc, deleteDoc } from "firebase/firestore";

export async function deleteProject(userId, projectId) {
  if (!userId || !projectId) {
    throw new Error("Missing userId or projectId");
  }
  try {
    await deleteDoc(doc(db, "users", userId, "projects", projectId));
    console.log("Project deleted successfully");
  } catch (error) {
    console.error("Error deleting project:", error);
  }
}
