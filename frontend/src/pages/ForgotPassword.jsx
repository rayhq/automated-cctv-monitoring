// src/pages/ForgotPassword.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  KeyRound,
  ArrowLeft,
  Loader2,
  CheckCircle2,
} from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: request OTP, 2: verify & reset
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });

      const data = await res.json().catch(() => ({}));
      console.log("request-otp response:", res.status, data);

      if (!res.ok) {
        let message =
          typeof data.detail === "string"
            ? data.detail
            : data.message || "Failed to send OTP.";
        throw new Error(message);
      }

      setInfo(
        data.detail ||
          "OTP sent to your registered mobile number, if the account exists."
      );
      setStep(2);
    } catch (err) {
      console.error("OTP request error:", err);
      if (err instanceof Error) {
        setError(err.message || "Failed to send OTP.");
      } else if (typeof err === "string") {
        setError(err);
      } else {
        setError("Failed to send OTP.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetWithOtp = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-with-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, otp, new_password: newPassword }),
      });

      const data = await res.json().catch(() => ({}));
      console.log("reset-with-otp response:", res.status, data);

      if (!res.ok) {
        let message =
          typeof data.detail === "string"
            ? data.detail
            : data.message || "Failed to reset password.";
        throw new Error(message);
      }

      setInfo(
        data.detail || "Password reset successful. Redirecting to login..."
      );
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      console.error("OTP reset error:", err);
      if (err instanceof Error) {
        setError(err.message || "Failed to reset password.");
      } else if (typeof err === "string") {
        setError(err);
      } else {
        setError("Failed to reset password. Please try again.");
      }
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
        <div className="backdrop-blur-xl bg-slate-900/70 border border-slate-700/50 rounded-3xl shadow-2xl shadow-black/40 px-8 py-8 sm:px-10 sm:py-10">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mb-4 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to login
          </button>

          <div className="text-center space-y-1 mb-6">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {step === 1 ? "Forgot password?" : "Verify OTP"}
            </h1>
            <p className="text-sm text-slate-400">
              {step === 1
                ? "Enter your username to receive a one-time code on your registered mobile number."
                : `Enter the OTP sent to the number linked with "${identifier}", then set a new password.`}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200 flex items-start gap-2">
              <span className="mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {info && (
            <div className="mb-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5" />
              <span>{info}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="identifier"
                  className="text-xs font-medium text-slate-300"
                >
                  Username
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-600/70 bg-slate-900/60 px-3 py-2.5 focus-within:border-indigo-500/80 focus-within:bg-slate-900/90 transition-all duration-200">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-transparent outline-none text-sm placeholder:text-slate-500"
                    placeholder="admin"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-150"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending code…
                  </>
                ) : (
                  "Send OTP"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetWithOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="otp"
                  className="text-xs font-medium text-slate-300"
                >
                  One-time code (OTP)
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-600/70 bg-slate-900/60 px-3 py-2.5 focus-within:border-indigo-500/80 focus-within:bg-slate-900/90 transition-all duration-200">
                  <KeyRound className="h-4 w-4 text-slate-400" />
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-transparent outline-none text-sm placeholder:text-slate-500 tracking-[0.3em]"
                    placeholder="••••••"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="newPassword"
                  className="text-xs font-medium text-slate-300"
                >
                  New password
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-600/70 bg-slate-900/60 px-3 py-2.5 focus-within:border-indigo-500/80 focus-within:bg-slate-900/90 transition-all duration-200">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-transparent outline-none text-sm placeholder:text-slate-500"
                    placeholder="Enter a strong password"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="text-xs font-medium text-slate-300"
                >
                  Confirm password
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-600/70 bg-slate-900/60 px-3 py-2.5 focus-within:border-indigo-500/80 focus-within:bg-slate-900/90 transition-all duration-200">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-transparent outline-none text-sm placeholder:text-slate-500"
                    placeholder="Re-enter new password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-150"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Verify & reset password"
                )}
              </button>
            </form>
          )}

          <p className="mt-4 text-[11px] text-center text-slate-500">
            For security reasons, OTPs expire after a short time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
