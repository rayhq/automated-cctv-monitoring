import React from "react";
import { NavLink } from "react-router-dom";
import {
  Activity,
  Camera,
  Shield,
  Settings,
  AlertCircle,
  Video,
  LogOut,
  Menu,
  X
} from "lucide-react";

const TopNav = ({ user, onLogout, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const links = [
    { to: "/", label: "Dashboard", icon: Activity, end: true },
    { to: "/live", label: "Live View", icon: Video },
    { to: "/events", label: "Events", icon: AlertCircle },
    { to: "/cameras", label: "Cameras", icon: Camera },
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      {/* Navbar Container */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-[52px] bg-[#161617]/80 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          
          {/* Left: Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center text-white">
               <Shield className="w-5 h-5" />
            </div>
            <span className="hidden sm:block text-[19px] font-semibold text-white tracking-tight -ml-1">
              AI Sentry
            </span>
          </div>

          {/* Center: Desktop Links (Apple Style) */}
          <div className="hidden md:flex items-center gap-8 h-full">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `text-[12px] font-medium tracking-wide transition-colors duration-300 ${
                    isActive ? "text-white" : "text-[#cecece] hover:text-white"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Right: User & Mobile Toggle */}
          <div className="flex items-center gap-4">
             {/* User Profile (Minimal) */}
            <div className="hidden sm:flex items-center gap-3 text-xs text-[#cecece]">
                <span>{user?.username}</span>
                <button 
                    onClick={onLogout}
                    className="hover:text-white transition-colors"
                    title="Logout"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-[#cecece] hover:text-white transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </nav>
      
      {/* Mobile Menu Dropdown */}
      <div 
        className={`fixed inset-x-0 top-[52px] bg-[#161617] border-b border-white/10 z-40 transition-all duration-300 overflow-hidden md:hidden ${
            isMobileMenuOpen ? "h-auto opacity-100 py-4" : "h-0 opacity-0 py-0"
        }`}
      >
         <div className="px-8 flex flex-col space-y-4">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `text-[17px] font-medium transition-colors duration-300 ${
                    isActive ? "text-white" : "text-[#cecece] hover:text-white"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[#cecece]">
                <span>{user?.username}</span>
                <button onClick={onLogout} className="flex items-center gap-2 hover:text-white">
                    Logout <LogOut className="w-4 h-4" />
                </button>
            </div>
         </div>
      </div>
    </>
  );
};

export default TopNav;
