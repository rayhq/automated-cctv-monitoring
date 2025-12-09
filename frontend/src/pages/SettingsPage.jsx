// src/pages/SettingsPage.jsx
import React, { useState } from "react";
import { api } from "../services/api";
import { AlertTriangle, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const SettingsPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [dangerLoading, setDangerLoading] = useState(false);

  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // 🔐 Change password + auto logout
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (newPassword !== confirmNewPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.changePassword(currentPassword, newPassword);

      setMessage(res.detail || "Password updated successfully.");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");

      // Auto-logout and send to login with a nice message
      await logout();
      navigate("/login", {
        replace: true,
        state: { passwordChanged: true },
      });
    } catch (err) {
      setError(err.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  // 🗑 Delete ONLY events
  const handleResetEvents = async () => {
    if (
      !window.confirm(
        "This will DELETE ALL EVENTS from the database.\nThis action CANNOT be undone.\n\nProceed?"
      )
    ) {
      return;
    }

    try {
      setDangerLoading(true);
      setError(null);
      setMessage(null);

      const res = await api.resetEvents();
      setMessage(res.detail || "All events deleted successfully.");
    } catch (err) {
      setError(err.message || "Failed to delete events.");
    } finally {
      setDangerLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-[fadeIn_0.5s_ease-in]">
      <h1 className="text-2xl font-semibold text-white">System Settings</h1>
      <p className="text-slate-400">
        Configuration options for alerts, retention and security.
      </p>

      {/* Top settings cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/90 border border-slate-800/70 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-white mb-2">
            Alert Sensitivity
          </h2>
          <p className="text-sm text-slate-400 mb-3">
            Controls how aggressive the suspicious activity detection is.
          </p>
          <p className="text-sm text-slate-300">
            Current: <span className="font-semibold">Medium</span> (demo)
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/70 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-white mb-2">
            Event Retention
          </h2>
          <p className="text-sm text-slate-400 mb-3">
            How long event logs are retained in the database.
          </p>
          <p className="text-sm text-slate-300">
            Current: <span className="font-semibold">30 days</span> (demo)
          </p>
        </div>
      </div>

      {/* 🔐 Change Password */}
      <div className="bg-slate-900/90 border border-slate-800/70 rounded-xl p-4 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-5 h-5 text-sky-400" />
          <h2 className="text-lg font-semibold text-white">
            Change Admin Password
          </h2>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Update the password for the currently logged-in admin account. After a
          successful change, you&apos;ll be logged out automatically.
        </p>

        <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Current password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium disabled:opacity-60"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>

      {/* 🔥 Danger Zone – only Delete All Events */}
      <div className="bg-red-900/10 border border-red-600/40 rounded-xl p-4 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
        </div>

        <p className="text-sm text-red-300 mb-4">
          These actions permanently delete data. They cannot be undone.
        </p>

        <button
          onClick={handleResetEvents}
          disabled={dangerLoading}
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60"
        >
          {dangerLoading ? "Deleting..." : "Delete All Events"}
        </button>

        {/* Shared status messages */}
        {message && (
          <p className="text-sm text-emerald-400 mt-3">{message}</p>
        )}
        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
      </div>
    </div>
  );
};

export default SettingsPage;
