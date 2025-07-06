import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./Dashboard";
import Login from "./Login";
import Signup from "./Signup";
import Settings from "./Settings";
import ProtectedRoute from "./ProtectedRoute";
import { AuthProvider } from "./AuthContext";
import Navbar from "./Navbar";
import ResearchBrowser from "./ResearchBrowser";
import Browser from "./Browser";
import ProjectPage from "./ProjectPage";

function App() {
  return (
    <AuthProvider> 
      <Router>
        <Navbar />
        <Routes>

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Settings */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />



          <Route
  path="/projects/:projectId"
  element={
    <ProtectedRoute>
      <ProjectPage />
    </ProtectedRoute>
  }
/>


          {/* Browser for project-specific PDF and AI work */}
          <Route
            path="/browser/:projectId"
            element={
              <ProtectedRoute>
                <Browser />
              </ProtectedRoute>
            }
          />

          {/* Research Browser for general arXiv or external paper searches */}
          <Route
            path="/research-browser"
            element={
              <ProtectedRoute>
                <ResearchBrowser />
              </ProtectedRoute>
            }
          />

          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Fallback */}
          <Route path="*" element={<Login />} /> 

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
