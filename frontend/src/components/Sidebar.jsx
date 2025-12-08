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

const Sidebar = ({ user, onLogout }) => {
  const initial = (user?.username || "A").charAt(0).toUpperCase();
  const role = user?.is_admin ? "Administrator" : "Viewer";

  return (
    <aside className="w-64 bg-[#0E131A] border-r border-[#1F2430] flex flex-col">
      <div className="p-3 flex-1 flex flex-col">
        {/* App card */}
        <div className="bg-[#101623] border border-[#1F2430] rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#0EA5E9]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#E5E7EB]">
                AI-assisted
              </p>
              <p className="text-xs text-[#9CA3AF]">Campus Security</p>
            </div>
          </div>
        </div>

        {/* Main nav */}
        <nav className="space-y-0">
          <SidebarLink to="/" end icon={Activity} label="Dashboard" />
          <SidebarLink to="/live" icon={Video} label="Live View" />
          <SidebarLink to="/events" icon={AlertCircle} label="Events" />
          <SidebarLink to="/cameras" icon={Camera} label="Cameras" />
        </nav>

        {/* Secondary nav */}
        <div className="mt-5 pt-3 border-t border-[#1F2430]">
          <SidebarLink
            to="/settings"
            icon={Settings}
            label="Settings"
            small
          />
        </div>
      </div>

      {/* User card */}
      <div className="p-3 border-t border-[#1F2430]">
        <div className="flex items-center gap-3 px-3 py-2 bg-[#101623] rounded-xl border border-[#1F2430]">
          <div className="w-8 h-8 rounded-full bg-[#111827] flex items-center justify-center text-xs font-semibold">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.full_name || user?.username || "Admin"}
            </p>
            <p className="text-xs text-[#9CA3AF] truncate">{role}</p>
          </div>
          <button
            onClick={onLogout}
            className="text-[#9CA3AF] hover:text-red-400 transition"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
