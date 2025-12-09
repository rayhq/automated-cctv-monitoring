// src/pages/LoginPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Lock, AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(
    localStorage.getItem("remember_device") === "1"
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // banner after password change
  const [passwordChanged, setPasswordChanged] = useState(
    !!location.state?.passwordChanged
  );

  // system status: "checking" | "online" | "offline"
  const [systemStatus, setSystemStatus] = useState("checking");

  // Handle password-changed routing state
  useEffect(() => {
    if (location.state?.passwordChanged) {
      setPasswordChanged(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  // Check backend health for status pill
  useEffect(() => {
    let cancelled = false;

    const checkHealth = async () => {
      try {
        const res = await api.checkSystemHealth();
        if (cancelled) return;

        if (res.status === "ok") {
          setSystemStatus("online");
        } else {
          setSystemStatus("offline");
        }
      } catch {
        if (!cancelled) setSystemStatus("offline");
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // every 30s
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username.trim(), password);

      if (rememberDevice) {
        localStorage.setItem("remember_device", "1");
      } else {
        localStorage.removeItem("remember_device");
      }

      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // status pill styling
  const statusConfig = {
    checking: {
      text: "Checking system status…",
      container:
        "bg-slate-800/60 border border-slate-700 text-slate-300",
      dot: "bg-slate-400 animate-pulse",
    },
    online: {
      text: "System Online",
      container:
        "bg-emerald-500/10 border border-emerald-500/40 text-emerald-300",
      dot: "bg-emerald-400 animate-pulse",
    },
    offline: {
      text: "System Offline",
      container: "bg-red-500/10 border border-red-500/40 text-red-300",
      dot: "bg-red-400 animate-pulse",
    },
  };

  const status = statusConfig[systemStatus] || statusConfig.checking;

  return (
    <div
      className="relative min-h-screen flex items-center justify-center
                 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950
                 overflow-hidden"
    >
      {/* animated glow layers */}
      <div
        className="pointer-events-none absolute inset-0
                   bg-[radial-gradient(circle_at_50%_40%,rgba(59,130,246,0.18),transparent_60%)]
                   opacity-80 animate-pulse"
      />
      <div
        className="pointer-events-none absolute inset-0
                   bg-[radial-gradient(circle_at_15%_85%,rgba(147,51,234,0.18),transparent_55%)]"
      />

      {/* login card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div
          className="bg-slate-900/95 border border-slate-800/80 rounded-3xl
                     shadow-[0_28px_80px_rgba(15,23,42,0.9)]
                     px-8 py-9 backdrop-blur-xl
                     transform-gpu transition-transform duration-300
                     hover:-translate-y-1 hover:scale-[1.01]"
        >
          {/* System status pill */}
          <div className="flex justify-center mb-4">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] ${status.container}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
              />
              {status.text}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-lg font-semibold text-white text-center mb-2">
            Sign in to your account
          </h2>
          <p className="text-xs text-slate-400 text-center mb-5">
            Enter your admin credentials to access the security dashboard.
          </p>

          {/* Success banner after password change */}
          {passwordChanged && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 mt-0.5" />
              <p>Password updated successfully. Please sign in again.</p>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="text-[11px] font-medium text-slate-300 mb-1 block">
                Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/70 transition"
                  placeholder="admin"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  className="text-[11px] text-slate-400 hover:text-slate-200"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/70 transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {/* Remember device */}
              <label className="flex items-center gap-2 text-[11px] text-slate-400 mt-2">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="h-3 w-3 rounded border-slate-600 bg-slate-900"
                />
                <span>Remember this device</span>
              </label>
            </div>

            {/* Sign in button with spinner */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/40 hover:shadow-blue-500/60 transition disabled:opacity-60"
            >
              {loading && (
                <span className="inline-block h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              <span>{loading ? "Signing in..." : "Sign in"}</span>
            </button>
          </form>

          {/* Footer */}
          <p className="mt-4 text-[10px] text-center text-slate-500">
            v0.1.0 · Admin access only. Your activity may be monitored for
            security purposes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
