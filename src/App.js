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

function App() {
  return (
    <AuthProvider> 
      

      
       {/* wrap all routes with AuthProvider */}
      <Router>
                <Navbar />
        
        <Routes>

          <Route
  path="/browser"
  element={
    <ProtectedRoute>
      <ResearchBrowser />
    </ProtectedRoute>
  }
/>

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />



          <Route
  path="/browser/:projectId"
  element={
    <ProtectedRoute>
      <ResearchBrowser />
    </ProtectedRoute>
  }
/>



          
          <Route path="*" element={<Login />} /> {/* fallback */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
