import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { getDarkMode, setDarkMode } from "./settingsHelpers"; // or your existing imports
import { storage, db } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function Settings() {
  const { currentUser } = useAuth();
  const [darkMode, setDarkModeState] = useState(false);

  // Profile Image Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState(null);

  useEffect(() => {
    if (currentUser) {
      getDarkMode(currentUser.uid).then(value => {
        setDarkModeState(value);
        applyTheme(value);
      });

      // Fetch profile image URL from Firestore
      const fetchProfileImage = async () => {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setProfileImageUrl(userDocSnap.data().profileImageUrl || null);
        }
      };
      fetchProfileImage();
    }
  }, [currentUser]);

  const applyTheme = (isDark) => {
    if (isDark) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  };

  const handleToggleDarkMode = () => {
    const newValue = !darkMode;
    setDarkMode(currentUser.uid, newValue);
    setDarkModeState(newValue);
    applyTheme(newValue);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);

    try {
      const imageRef = ref(storage, `profile_pictures/${currentUser.uid}`);
      await uploadBytes(imageRef, selectedFile);
      const downloadURL = await getDownloadURL(imageRef);

      // Save URL to Firestore user document
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, { profileImageUrl: downloadURL });

      setProfileImageUrl(downloadURL);
      alert("Image uploaded successfully!");
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      alert("Upload failed.");
      console.error(error);
    }
    setUploading(false);
  };

  return (
    <div className="container">
      <h2>Settings</h2>
      <p>Email: {currentUser.email}</p>

      {/* Profile Image Display */}
      {profileImageUrl && (
        <div style={{ marginBottom: "15px" }}>
          <img
            src={profileImageUrl}
            alt="Profile"
            style={{ maxWidth: "150px", borderRadius: "50%" }}
          />
        </div>
      )}

      {/* Profile Image Upload Section */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{ fontWeight: "bold" }}>Select Profile Image</label>
        <br />
        <input type="file" accept="image/*" onChange={handleFileChange} />
        {previewUrl && (
          <div>
            <img
              src={previewUrl}
              alt="Preview"
              style={{ maxWidth: "200px", marginTop: "10px" }}
            />
          </div>
        )}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          style={{ marginTop: "10px" }}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {/* Dark Mode Toggle */}
      <button onClick={handleToggleDarkMode}>
        Toggle Dark Mode ({darkMode ? "On" : "Off"})
      </button>
    </div>
  );
}
