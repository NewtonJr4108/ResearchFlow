import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function addTask(projectId, title, dueDate, status = "todo") {
  try {
    const tasksRef = collection(db, "projects", projectId, "tasks");
    const docRef = await addDoc(tasksRef, {
      title: title,
      dueDate: dueDate,
      status: status,
      createdAt: serverTimestamp()
    });
    console.log("Task added with ID:", docRef.id);
  } catch (e) {
    console.error("Error adding task:", e);
  }
}
