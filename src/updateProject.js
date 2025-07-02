import { db } from "./firebase";
import { doc, updateDoc } from "firebase/firestore";

export async function updateProject(projectId, updatedData) {
  const projectRef = doc(db, "projects", projectId);
  await updateDoc(projectRef, updatedData);
}
