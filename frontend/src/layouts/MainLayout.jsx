import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [healthStatus, setHealthStatus] = useState("checking");

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await api.checkSystemHealth();
        setHealthStatus(health.status === "ok" ? "online" : "offline");
      } catch (error) {
        console.error("Health check failed:", error);
        setHealthStatus("offline");
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-screen bg-[#0B0F14] text-[#E5E7EB]">
      {/* SIDEBAR */}
      <Sidebar user={user} onLogout={handleLogout} />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-[#0E131A] border-b border-[#1F2430] flex items-center justify-between px-6">
          <h2 className="text-xl font-semibold text-[#E5E7EB]">
            Smart Campus CCTV Monitoring
          </h2>
          <div className="flex items-center gap-4">
            <StatusPill status={healthStatus} />
            <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 via-cyan-400 to-blue-600 rounded-full flex items-center justify-center font-bold shadow-md shadow-black/40">
              {(user?.username || "A").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6 bg-[#0B0F14]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const StatusPill = ({ status }) => {
  const isOnline = status === "online";
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
        isOnline
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
          : status === "offline"
          ? "bg-red-500/10 text-red-400 border border-red-500/30"
          : "bg-[#111827] text-[#9CA3AF] border border-[#1F2430]"
      }`}
    >
      <div
        className={`w-1.5 h-1.5 rounded-full ${
          isOnline
            ? "bg-emerald-400"
            : status === "offline"
            ? "bg-red-400"
            : "bg-[#9CA3AF]"
        } animate-pulse`}
      />
      {isOnline
        ? "System Online"
        : status === "offline"
        ? "System Offline"
        : "Checking..."}
    </div>
  );
};

export default MainLayout;
