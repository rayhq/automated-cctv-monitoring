// src/pages/SettingsPage.jsx
import React, { useState } from "react";
import { api } from "../services/api";
import {
  AlertTriangle,
  Lock,
  Database,
  Bell,
  User,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const tabs = ["Account", "Notifications", "Data", "Security"];

const SettingsPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("Security");

  const [loading, setLoading] = useState(false);
  const [dangerLoading, setDangerLoading] = useState(false);

  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // 🔐 Change password
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

  // 🗑 Delete all events
  const handleResetEvents = async () => {
    if (
      !window.confirm(
        "This will DELETE ALL EVENTS.\nThis action CANNOT be undone.\n\nProceed?"
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

  // 💡 Password strength (visual only)
  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: "Start typing...", barClass: "w-0" };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    switch (score) {
      case 1:
        return { score, label: "Weak", barClass: "w-1/4 bg-red-500" };
      case 2:
        return { score, label: "Okay", barClass: "w-2/4 bg-amber-400" };
      case 3:
        return { score, label: "Good", barClass: "w-3/4 bg-lime-400" };
      case 4:
        return { score, label: "Strong", barClass: "w-full bg-emerald-400" };
      default:
        return { score: 0, label: "Start typing...", barClass: "w-0" };
    }
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <div className="px-6 py-6 space-y-6 text-white">
      {/* Header */}
      <div>
        <p className="text-sm font-medium text-slate-400">Settings</p>
        <h1 className="text-3xl font-semibold mt-1">
          Smart Campus CCTV Monitoring
        </h1>
        <p className="text-slate-400 mt-1">
          Update security settings and clean up system data for the CCTV
          dashboard.
        </p>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-full bg-slate-900/60 border border-slate-800 p-1 backdrop-blur-md">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm rounded-full transition ${
              activeTab === tab
                ? "bg-white/90 text-black shadow-sm backdrop-blur-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ACCOUNT TAB */}
      {activeTab === "Account" && (
        <GlassCard>
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-1">
            <User className="w-5 h-5 text-cyan-400" />
            Account
          </h2>
          <p className="text-slate-400 text-sm">
            Profile configuration and user identity will be added here later.
          </p>
        </GlassCard>
      )}

      {/* NOTIFICATIONS TAB */}
      {activeTab === "Notifications" && (
        <GlassCard>
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-1">
            <Bell className="w-5 h-5 text-cyan-400" />
            Notifications
          </h2>
          <p className="text-slate-400 text-sm">
            Notification settings will be added here later.
          </p>
        </GlassCard>
      )}

      {/* DATA TAB */}
      {activeTab === "Data" && (
        <div
          className="
            relative
            rounded-2xl
            border border-red-500/40
            bg-gradient-to-br from-red-950/60 to-red-900/40
            backdrop-blur-xl
            p-6
            overflow-hidden
          "
        >
          {/* Inner light only (no outer glow) */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-30" />

          <div className="relative z-10">
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-2 text-red-400">
              <Database className="w-5 h-5" />
              Data management
            </h2>

            <p className="text-red-200 text-sm mb-2">
              Delete all stored events from the database. User accounts and
              camera configuration will be kept.
            </p>

            <div className="flex items-start gap-2 text-red-300 text-xs mb-4">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <span>
                This operation is irreversible. Make sure you have exported any
                reports or evidence you need before wiping the event history.
              </span>
            </div>

            <button
              onClick={handleResetEvents}
              disabled={dangerLoading}
              className="
                px-5 py-2
                rounded-lg
                bg-red-600 hover:bg-red-700
                text-white text-sm font-medium
                border border-red-400/60
                shadow-inner
                transition
                disabled:opacity-60
              "
            >
              {dangerLoading ? "Deleting..." : "Delete all events"}
            </button>
          </div>
        </div>
      )}

      {/* SECURITY TAB – modern password reset */}
      {activeTab === "Security" && (
        <GlassCard accent="blue">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-semibold">Security</h2>
              </div>
              <p className="text-slate-400 text-sm">
                Change your admin password. You&apos;ll be signed out after a
                successful update.
              </p>
            </div>

            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
              <ShieldCheck className="w-3 h-3" />
              Admin only
            </span>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-5 max-w-xl">
            {/* Current password */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">
                Current password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="
                  w-full
                  px-3 py-2.5
                  rounded-lg
                  bg-white/5
                  border border-white/15
                  backdrop-blur-md
                  text-white
                  placeholder:text-slate-400
                  focus:outline-none
                  focus:border-cyan-400/70
                  focus:ring-0
                  text-sm
                "
                placeholder="Enter your current password"
                required
              />
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-slate-500/40 to-transparent" />

            {/* New password section */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-300">
                  Set a new password
                </p>
                <p className="text-[11px] text-slate-500">
                  Use a strong password with a mix of characters.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">
                    New password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="
                      w-full
                      px-3 py-2.5
                      rounded-lg
                      bg-white/5
                      border border-white/15
                      backdrop-blur-md
                      text-white
                      placeholder:text-slate-400
                      focus:outline-none
                      focus:border-cyan-400/70
                      focus:ring-0
                      text-sm
                    "
                    placeholder="Create a strong password"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-400">
                    Confirm new password
                  </label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="
                      w-full
                      px-3 py-2.5
                      rounded-lg
                      bg-white/5
                      border border-white/15
                      backdrop-blur-md
                      text-white
                      placeholder:text-slate-400
                      focus:outline-none
                      focus:border-cyan-400/70
                      focus:ring-0
                      text-sm
                    "
                    placeholder="Re-type new password"
                    required
                  />
                </div>
              </div>

              {/* Password strength */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Password strength</span>
                  <span
                    className={
                      strength.score >= 3
                        ? "text-emerald-400"
                        : strength.score === 0
                        ? "text-slate-500"
                        : "text-amber-300"
                    }
                  >
                    {strength.label}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strength.barClass}`}
                  />
                </div>
              </div>

              {/* Requirements bullets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  Minimum 8 characters
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  At least 1 uppercase letter
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  At least 1 number
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  Use a symbol for extra security
                </div>
              </div>
            </div>

            {/* Submit + messages */}
            <div className="pt-1 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="
                  inline-flex items-center justify-center
                  px-5 py-2.5
                  rounded-lg
                  bg-cyan-400/90
                  hover:bg-cyan-400
                  text-black text-sm font-semibold
                  border border-cyan-300/60
                  shadow-inner
                  transition
                  disabled:opacity-60
                "
              >
                {loading ? "Updating..." : "Update password"}
              </button>

              {message && (
                <p className="text-sm text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  {message}
                </p>
              )}
              {error && (
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </p>
              )}
            </div>
          </form>
        </GlassCard>
      )}
    </div>
  );
};

/* Glassmorphism Wrapper */
const GlassCard = ({ children, accent = "none" }) => {
  const accentBorder =
    accent === "blue" ? "border-cyan-400/40" : "border-white/10";

  return (
    <div
      className={`
        relative
        rounded-2xl
        border
        ${accentBorder}
        bg-gradient-to-br from-white/10 to-white/5
        backdrop-blur-xl
        p-6
        overflow-hidden
      `}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-40" />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default SettingsPage;
