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
        px-3 ${small ? "py-1.5" : "py-2"} 
        rounded-lg text-sm font-medium 
        transition-all duration-200 ease-in-out
        cursor-pointer select-none
        ${
          isActive
            ? "bg-[#343743] text-white"
            : "text-[#9CA3AF] hover:text-white hover:bg-[#111827]"
        }
        active:scale-[0.97]
        `
      }
    >
      {Icon && (
        <Icon
          className={`w-4 h-4 transition-colors duration-200 ${
            // icon color
            "text-[#6B7280] group-hover:text-white"
          }`}
        />
      )}
      <span>{label}</span>
    </NavLink>
  );
};

export default SidebarLink;
