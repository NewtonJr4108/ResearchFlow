import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function addProject(userId, title, description, dueDate) {
  try {
    const docRef = await addDoc(collection(db, "projects"), {
      userId: userId,
      title: title,
      description: description,
      dueDate: dueDate,
      createdAt: serverTimestamp()
    });
    console.log("Project added with ID:", docRef.id);
  } catch (e) {
    console.error("Error adding project:", e);
  }
}
