// src/layouts/MainLayout.jsx
import React, { useState, useEffect } from "react";
import { AlertCircle, Activity, Camera, Shield, LogOut } from "lucide-react";
import { api } from "../services/api";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [healthStatus, setHealthStatus] = useState("checking"); // Start with checking state

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

    checkHealth(); // Initial check
    const interval = setInterval(checkHealth, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/50 flex flex-col">
        <div className="p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3 group cursor-pointer">
            <motion.div
              className="w-10 h-10 bg-gradient-to-br from-cyan-500 via-cyan-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              <Shield className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-lg font-bold text-white">AI-assisted</h1>
              <p className="text-xs text-slate-400">Campus Security</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 relative">
          <NavItem to="/" icon={Activity} label="Dashboard" />
          <NavItem to="/live" icon={Camera} label="Live View" />
          <NavItem to="/events" icon={AlertCircle} label="Events" />
          <NavItem to="/cameras" icon={Camera} label="Cameras" />
          <NavItem to="/settings" icon={Shield} label="Settings" />
        </nav>

        {/* USER SECTION */}
        <div className="p-4 border-t border-slate-800/50">
          <div className="flex items-center gap-3 p-3 bg-slate-800/50 backdrop-blur-sm rounded-lg">
            <div className="w-9 h-9 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center text-base font-semibold">
              {(user?.username || "A").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium text-white truncate">
                {user?.full_name || user?.username || "Admin"}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {user?.is_admin ? "Administrator" : "Viewer"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-400 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50 flex items-center justify-between px-6 shadow-lg shadow-slate-950/10">
          <h2 className="text-xl font-semibold text-white">
            Smart Campus CCTV Monitoring
          </h2>
          <div className="flex items-center gap-4">
            <StatusPill status={healthStatus} />
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 via-cyan-400 to-blue-600 rounded-full flex items-center justify-center font-bold shadow-lg">
              {(user?.username || "A").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// 🔥 Modern animated NavItem with sliding pill using Framer Motion
const NavItem = ({ icon: Icon, label, to }) => {
  return (
    <NavLink to={to} end={to === "/"} className="block">
      {({ isActive }) => (
        <div className="relative mb-1">
          {isActive && (
            <motion.div
              layoutId="sidebar-active-pill"
              className="absolute inset-0 rounded-lg bg-slate-900/90 border border-cyan-500/40 shadow-md shadow-cyan-500/20"
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 26,
                mass: 0.8,
              }}
            />
          )}

          <motion.div
            className={`relative flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer select-none group ${
              isActive
                ? "text-cyan-300"
                : "text-slate-400 hover:text-slate-100"
            }`}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
          >
            <Icon
              className={`w-5 h-5 transition-colors duration-300 ${
                isActive
                  ? "text-cyan-300"
                  : "text-slate-400 group-hover:text-cyan-300"
              }`}
            />
            <span className="text-base font-medium transition-transform duration-300 group-hover:translate-x-0.5">
              {label}
            </span>
          </motion.div>
        </div>
      )}
    </NavLink>
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
          : "bg-slate-700/50 text-slate-400 border border-slate-600/50"
      }`}
    >
      <div
        className={`w-1.5 h-1.5 rounded-full ${
          isOnline
            ? "bg-emerald-400"
            : status === "offline"
            ? "bg-red-400"
            : "bg-slate-400"
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
