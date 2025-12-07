import React from "react";
import SidebarLink from "./SidebarLink";
import { Activity, Camera, Shield, Settings, Video } from "lucide-react";

const Sidebar = () => {
  return (
    <aside className="w-64 min-h-screen bg-slate-950 border-r border-slate-800 px-3 py-4">
      {/* Logo / Title */}
      <div className="px-2 mb-6">
        <h1 className="text-xl font-bold text-white tracking-wide">
          CCTV <span className="text-cyan-400">Monitor</span>
        </h1>
      </div>

      {/* Navigation */}
      <nav className="space-y-1">
        <SidebarLink to="/" icon={Activity} label="Dashboard" />
        <SidebarLink to="/live" icon={Video} label="Live View" />
        <SidebarLink to="/events" icon={Shield} label="Events" />
        <SidebarLink to="/cameras" icon={Camera} label="Cameras" />
        <SidebarLink to="/settings" icon={Settings} label="Settings" />
      </nav>
    </aside>
  );
};

export default Sidebar;
