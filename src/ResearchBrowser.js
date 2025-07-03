import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";
import { useParams } from "react-router-dom";

export default function ResearchBrowser() {
  const { currentUser } = useAuth();
  const { projectId } = useParams();

  const [topic, setTopic] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoryInput, setCategoryInput] = useState("");

  const handleAddCategory = () => {
    if (categoryInput.trim() !== "") {
      setCategories([...categories, categoryInput.trim()]);
      setCategoryInput("");
    }
  };

  const handleSaveSearch = async () => {
    if (!topic) {
      alert("Please enter a topic.");
      return;
    }

    try {
      await addDoc(collection(db, "users", currentUser.uid, "projects", projectId, "searches"), {
        topic,
        categories,
        createdAt: new Date(),
      });
      alert("Search preferences saved!");
      setTopic("");
      setCategories([]);
    } catch (error) {
      console.error("Error saving search:", error);
      alert("Failed to save search.");
    }
  };

  return (
    <div className="container">
      <h2>Research Preferences for Project {projectId}</h2>

      <input
        type="text"
        placeholder="Enter research topic or question"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
      /><br/>

      <h4>Categories / Keywords</h4>
      <input
        type="text"
        placeholder="Add category or keyword"
        value={categoryInput}
        onChange={(e) => setCategoryInput(e.target.value)}
      />
      <button onClick={handleAddCategory}>Add</button>

      <ul>
        {categories.map((cat, idx) => (
          <li key={idx}>{cat}</li>
        ))}
      </ul>

      <button onClick={handleSaveSearch}>Save Search Preferences</button>
    </div>
  );
}
