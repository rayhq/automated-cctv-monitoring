import React from "react";
import SidebarLink from "./SidebarLink";
import {
  Activity,
  Camera,
  Shield,
  Settings,
  AlertCircle,
  Video,
  LogOut,
} from "lucide-react";

const Sidebar = ({ user, onLogout, isOpen, onClose }) => {
  const initial = (user?.username || "A").charAt(0).toUpperCase();
  const role = user?.is_admin ? "Administrator" : "Viewer";

  const sidebarClasses = `
    flex flex-col 
    md:translate-x-0 md:static md:inset-auto md:w-64 md:m-4 md:mr-0 md:rounded-xl md:h-[calc(100vh-2rem)]
    fixed inset-y-0 left-0 z-50 w-64 bg-[#0B0F14]/95 backdrop-blur-xl border-r border-white/10 transition-transform duration-300 ease-in-out
    ${isOpen ? "translate-x-0" : "-translate-x-full"}
    glass-panel md:glass-panel
  `;

  return (
    <>
        {/* Mobile Backdrop */}
        {isOpen && (
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                onClick={onClose}
            />
        )}

        <aside className={sidebarClasses}>
          <div className="p-3 flex-1 flex flex-col">
            {/* App card */}
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-100 tracking-tight">
                    AI Sentry
                  </p>
                  <p className="text-[10px] text-sky-300 font-medium tracking-wider uppercase">Active Monitoring</p>
                </div>
              </div>
            </div>

            {/* Main nav */}
            <nav className="space-y-1">
              <SidebarLink to="/" end icon={Activity} label="Dashboard" onClick={onClose} />
              <SidebarLink to="/live" icon={Video} label="Live View" onClick={onClose} />
              <SidebarLink to="/events" icon={AlertCircle} label="Events" onClick={onClose} />
              <SidebarLink to="/cameras" icon={Camera} label="Cameras" onClick={onClose} />
            </nav>

            {/* Secondary nav */}
            <div className="mt-5 pt-3 border-t border-white/5">
              <SidebarLink
                to="/settings"
                icon={Settings}
                label="Settings"
                small
                onClick={onClose}
              />
            </div>
          </div>

          {/* User card */}
          <div className="p-3 border-t border-white/5">
            <div className="flex items-center gap-3 px-3 py-2 bg-white/5 hover:bg-white/10 transition-colors rounded-xl border border-white/5">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 border border-white/10">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-slate-200">
                  {user?.full_name || user?.username || "Admin"}
                </p>
                <p className="text-xs text-slate-400 truncate">{role}</p>
              </div>
              <button
                onClick={onLogout}
                className="text-slate-400 hover:text-red-400 transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
    </>
  );
};

export default Sidebar;
