// src/pages/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Lock,
  User,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [form, setForm] = useState({ username: "", password: "" });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(form.username, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      // adjust this to match how your login() throws errors
      setError(err?.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 relative overflow-hidden flex items-center justify-center px-4">
      {/* background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-10 h-80 w-80 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-10 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.05),_transparent_60%)]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* card */}
        <div className="backdrop-blur-xl bg-slate-900/70 border border-slate-700/50 rounded-3xl shadow-2xl shadow-black/40 px-8 py-8 sm:px-10 sm:py-10">
          {/* status pill */}
          <div className="flex items-center justify-center mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>System Online</span>
            </div>
          </div>

          {/* heading */}
          <div className="text-center space-y-1 mb-6">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Sign in to your account
            </h1>
            <p className="text-sm text-slate-400">
              Enter your admin credentials to access the security dashboard.
            </p>
          </div>

          {/* error */}
          {error && (
            <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* username */}
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="text-xs font-medium text-slate-300"
              >
                Username
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-600/70 bg-slate-900/60 px-3 py-2.5 focus-within:border-indigo-500/80 focus-within:bg-slate-900/90 transition-all duration-200">
                <User className="h-4 w-4 text-slate-400" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={form.username}
                  onChange={handleChange}
                  className="w-full bg-transparent outline-none text-sm placeholder:text-slate-500"
                  placeholder="admin"
                  required
                />
              </div>
            </div>

            {/* password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label
                  htmlFor="password"
                  className="font-medium text-slate-300"
                >
                  Password
                </label>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                  onClick={() => navigate("/forgot-password")} // ✅ add this
                >
                  Forgot?
                </button>
              </div>

              <div className="flex items-center gap-2 rounded-2xl border border-slate-600/70 bg-slate-900/60 px-3 py-2.5 focus-within:border-indigo-500/80 focus-within:bg-slate-900/90 transition-all duration-200">
                <Lock className="h-4 w-4 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full bg-transparent outline-none text-sm placeholder:text-slate-500"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="p-1 rounded-full hover:bg-slate-800/80 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* remember + helper */}
            <div className="flex items-center justify-between text-xs mt-2">
              <div className="flex items-center gap-1 text-slate-500">
                <ShieldCheck className="h-3 w-3" />
                <span>Admin access only</span>
              </div>
            </div>

            {/* submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-150"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* footer text */}
          <p className="mt-4 text-[11px] text-center text-slate-500">
            v0.1.0 · Admin access only. Your activity may be monitored for
            security purposes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
