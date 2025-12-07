import React from "react";
import { NavLink } from "react-router-dom";

const SidebarLink = ({ to, icon: Icon, label }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `
        group relative flex items-center gap-3 
        px-4 py-2.5 rounded-xl text-sm font-medium 
        transition-all duration-300 ease-in-out
        cursor-pointer select-none
        ${
          isActive
            ? "bg-slate-900/90 text-cyan-300 ring-1 ring-cyan-500/40 shadow-inner"
            : "text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80"
        }
        active:scale-[0.97]
        `
      }
    >
      {Icon && (
        <Icon className="w-4 h-4 text-slate-400 group-hover:text-cyan-300 transition-colors duration-200" />
      )}
      <span>{label}</span>
    </NavLink>
  );
};

export default SidebarLink;
