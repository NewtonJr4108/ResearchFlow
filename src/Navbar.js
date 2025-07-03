import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";

export default function Navbar() {
  const { currentUser } = useAuth();

  const handleLogout = () => {
    signOut(auth).then(() => console.log("Logged out"));
  };

  return (
    <nav className="navbar">
      <h1>ResearchFlow</h1>
      {currentUser && (
        <ul>
          <li><button onClick={() => window.location.href = "/browser"}>Research Browser</button></li>
          <li><Link to="/dashboard" className="nav-button">Dashboard</Link></li>
          <li><Link to="/settings" className="nav-button">Settings</Link></li>
          <li><button onClick={handleLogout} className="nav-button">Logout</button></li>
        </ul>
      )}
    </nav>
  );
}
