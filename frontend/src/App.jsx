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
import ForgotPassword from "./pages/ForgotPassword";

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* 🔓 Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* 🔐 Protected routes (require login) */}
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
