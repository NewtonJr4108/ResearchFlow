import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export const addProject = async (userId, title, description, dueDate, notes = "", links = []) => {
  try {
    const docRef = await addDoc(collection(db, "users", userId, "projects"), {
      title,
      description,
      dueDate,
      notes,
      links,
      createdAt: serverTimestamp(),
    });
    console.log("Project added with ID: ", docRef.id);
  } catch (error) {
    console.error("Error adding project: ", error);
  }
};
