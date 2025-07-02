import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth(); // add loading to context

  if (loading) {
    return <div>Loading...</div>; // or spinner
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
