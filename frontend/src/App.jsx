// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";

import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import CamerasPage from "./pages/CamerasPage";
import LiveView from "./pages/LiveView";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import EventsPage from "./pages/EventsPage";

// 🚫 TURN THIS OFF when you want real auth
const DEV_BYPASS_AUTH = false; // or just delete this flag

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  // no dev bypass anymore
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public route */}
        <Route
          path="/login"
          element={<LoginPage />}
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="cameras" element={<CamerasPage />} />
          <Route path="live" element={<LiveView />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="events" element={<EventsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
