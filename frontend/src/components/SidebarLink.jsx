import React from "react";
import { NavLink } from "react-router-dom";

const SidebarLink = ({ to, icon: Icon, label, end = false, small = false, ...props }) => {
  return (
    <NavLink
      to={to}
      end={end}
      {...props}
      className={({ isActive }) =>
        `
        group relative flex items-center gap-3 
        px-3 ${small ? "py-1.5" : "py-2.5"} 
        rounded-xl text-sm font-medium 
        transition-all duration-300 ease-out
        cursor-pointer select-none overflow-hidden
        ${
          isActive
            ? "bg-gradient-to-r from-cyan-500/10 to-blue-600/10 text-cyan-400 shadow-[0_0_20px_-5px_rgba(34,211,238,0.3)] border border-cyan-500/20"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
        }
        active:scale-[0.98]
        `
      }
    >
      {({ isActive }) => (
        <>
          {/* Active Indicator Bar */}
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 bg-cyan-400 rounded-r-full shadow-[0_0_10px_cyan]" />
          )}

          {Icon && (
            <Icon
              className={`w-[18px] h-[18px] transition-all duration-300 ${
                isActive
                  ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                  : "text-slate-500 group-hover:text-slate-300"
              }`}
            />
          )}
          <span className="relative z-10">{label}</span>
          
          {/* Subtle shine effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
        </>
      )}
    </NavLink>
  );
};

export default SidebarLink;
