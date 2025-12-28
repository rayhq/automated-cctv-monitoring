import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import CommandPalette from "../components/CommandPalette";

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [healthStatus, setHealthStatus] = useState("checking");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Command Palette Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    <div className="flex h-screen bg-transparent text-[#e2e8f0] font-sans overflow-hidden">
      {/* SIDEBAR */}
      <Sidebar 
        user={user} 
        onLogout={handleLogout} 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        {/* NEW TOP BAR (Overlay) */}
        <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
            {/* Re-enable pointer events for the actual bar */}
            <div className="pointer-events-auto">
                <TopBar 
                    user={user} 
                    onLogout={handleLogout}
                    isMobileMenuOpen={isMobileMenuOpen}
                    setIsMobileMenuOpen={setIsMobileMenuOpen}
                />
            </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto px-4 pb-4 pt-24 scrollbar-hide">
           {/* Full width container */}
           <div className="w-full">
             <React.Suspense fallback={<div className="h-full w-full animate-pulse bg-white/5 rounded-xl" />}>
                <Outlet />
             </React.Suspense>
           </div>
        </main>
      </div>
      
      {/* COMMAND PALETTE */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)}
        onLogout={handleLogout}
      />
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
