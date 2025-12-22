import React, { useState, useEffect, useRef } from "react";
import { Bell, Menu, Maximize2, Activity, Users, Zap, ChevronRight, Clock, ShieldAlert, PlusCircle, Settings, LogOut, User, X, AlertTriangle, CheckCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../services/api";

const TopBar = ({ user, isMobileMenuOpen, setIsMobileMenuOpen, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userCount, setUserCount] = useState(1);
  const [time, setTime] = useState(new Date());

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const profileRef = useRef(null);
  const notificationRef = useRef(null);

  // Time Ago Helper
  const getTimeAgo = (dateString) => {
    const date = new Date(dateString.endsWith("Z") ? dateString : dateString + "Z");
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Data
  useEffect(() => {
    if (user) {
        // User Count (Admin only)
        if (location.pathname === "/" && user.is_admin) {
            api.fetchUserCount().then(data => {
                if (data.total_users) setUserCount(data.total_users);
            }).catch(() => {});
        }

        // Recent Notifications (Intrusions)
        api.fetchEvents({ limit: 5, event_type: 'intrusion' }).then(data => {
             setNotifications(data || []);
        }).catch(err => console.error("Failed to fetch notifications", err));
    }
  }, [location.pathname, user]);

  const isDashboard = location.pathname === "/";
  
  // Dynamic Title Logic
  let headerContent;
  if (isDashboard) {
      headerContent = (
            <div className="flex flex-col justify-center">
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400">
                        Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'},
                    </span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                        {user?.username || 'User'}
                    </span>
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </span>
                </div>
            </div>
      );
  } else {
      const titles = {
          "/live": "Live Feed",
          "/events": "Event History",
          "/cameras": "Camera Management",
          "/settings": "System Settings",
          "/login": "Authentication"
      };
      const title = titles[location.pathname] || "Dashboard";
      
      headerContent = (
         <div className="flex flex-col justify-center h-full">
            <div className="flex items-center gap-1.5 mb-0.5">
                 <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Page</span>
                 <ChevronRight className="w-3 h-3 text-slate-600" />
                 <span className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">Active</span>
            </div>
            <h2 className="text-base font-bold text-slate-200 tracking-auto leading-none">{title}</h2>
        </div>
      );
  }

  return (
    <header className="h-[72px] z-20 sticky top-4 px-6 mx-6 rounded-2xl bg-[#0B0F14]/60 backdrop-blur-2xl border border-white/5 shadow-2xl shadow-black/40 flex items-center justify-between transition-all duration-300">
        {/* Left: Mobile Toggle & Title */}
        <div className="flex items-center gap-5 h-full">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg active:scale-95 transform"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Clean Header Content */}
            {isDashboard ? (
                <div className="flex flex-col justify-center">
                    <h2 className="text-lg font-medium tracking-tight text-white/90 flex items-center gap-2">
                        Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, 
                        <span className="text-white font-semibold">{user?.username || 'User'}</span>
                    </h2>
                    <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            ) : (
                <div className="flex flex-col justify-center h-full">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Page</span>
                        <ChevronRight className="w-3 h-3 text-slate-600" />
                        <span className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">Active</span>
                    </div>
                    {/* Re-deriving title since variable scope is inside render */}
                    <h2 className="text-base font-bold text-slate-200 tracking-auto leading-none">
                         { location.pathname === '/live' ? 'Live Feed' :
                           location.pathname === '/events' ? 'Event History' :
                           location.pathname === '/cameras' ? 'Camera Management' :
                           location.pathname === '/settings' ? 'System Settings' :
                           'Dashboard' }
                    </h2>
                </div>
            )}
        </div>

        {/* Dashboard Stats (Minimal) */}
        {isDashboard && (
             <div className="hidden xl:flex items-center gap-6 px-6 h-10 border-r border-white/5 mr-auto ml-8">
                 <div className="flex items-center gap-2 text-slate-400">
                    <Users className="w-4 h-4" />
                    <div className="flex flex-col leading-none">
                        <span className="text-xs font-semibold text-slate-300">{userCount}</span>
                        <span className="text-[9px] uppercase tracking-wider opacity-60">Users</span>
                    </div>
                 </div>
             </div>
        )}

        {/* Right Section: UNIFIED CAPSULE */}
        <div className="flex items-center ml-auto">
            <div className="hidden md:flex items-center bg-[#13151a]/60 backdrop-blur-md rounded-full border border-white/5 p-1 pr-1.5 gap-1 shadow-lg shadow-black/20">
                {/* 1. Status */}
                <div className="flex items-center gap-2 px-3 py-1.5 pr-4 border-r border-white/5">
                     <div className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Online</span>
                </div>

                {/* 2. Clock */}
                <div className="flex items-center gap-2 px-4 py-1.5 min-w-[90px] justify-center">
                    <span className="text-sm font-mono font-medium text-slate-300">
                        {time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit' })}
                    </span>
                </div>

                {/* 3. Actions Divider */}
                <div className="w-[1px] h-4 bg-white/5 mx-1"></div>

                {/* 4. Quick Actions (Icons Only for Cleanliness) */}
                <button 
                    onClick={() => navigate('/cameras')}
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                    title="Add Camera"
                >
                    <PlusCircle className="w-4 h-4" />
                </button>
                
                <button 
                     onClick={() => navigate('/events?type=intrusion')}
                     className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all"
                     title="Alerts"
                >
                    <ShieldAlert className="w-4 h-4" />
                </button>

                {/* Notification Dropdown */}
                <div className="relative" ref={notificationRef}>
                    <button 
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        className={`p-2 rounded-full transition-all relative ${isNotificationsOpen ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                    >
                        <Bell className="w-4 h-4" />
                        {notifications.length > 0 && (
                            <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-2 ring-[#0B0F14]"></span>
                        )}
                    </button>

                    {/* Popover */}
                    {isNotificationsOpen && (
                        <div className="absolute top-12 right-0 w-80 bg-[#0B0F14]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-slide-down origin-top-right z-50">
                             <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
                                <span className="text-sm font-semibold text-white">Notifications</span>
                                <button onClick={() => setIsNotificationsOpen(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4"/></button>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                {notifications.length === 0 ? (
                                    <div className="p-6 text-center text-slate-500">
                                        <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                        <p className="text-xs">All caught up!</p>
                                    </div>
                                ) : (
                                    notifications.map((alert, idx) => (
                                        <div key={idx} className="p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => navigate('/events')}>
                                            <div className="flex gap-3">
                                                <div className="mt-1">
                                                    <div className={`p-1.5 rounded-full ${alert.event_type === 'intrusion' ? 'bg-red-500/10 text-red-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                                        {alert.event_type === 'intrusion' ? <AlertTriangle className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                                                        {alert.event_type === 'intrusion' ? 'Security Violation' : 'Motion Detected'}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                                        Camera: <span className="text-indigo-400">{alert.camera_id}</span>
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 mt-1">{getTimeAgo(alert.timestamp)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="p-2 border-t border-white/5 bg-white/[0.02]">
                                <button onClick={() => navigate('/events')} className="w-full text-center text-[10px] font-medium text-indigo-400 hover:text-indigo-300 py-1 uppercase tracking-wide">
                                    View All History
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 5. Profile (Dropdown) */}
                <div className="pl-1 relative" ref={profileRef}>
                    <button 
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center shadow-inner hover:ring-2 hover:ring-white/20 transition-all outline-none"
                    >
                         <span className="text-xs font-bold text-white">
                            {(user?.username || "A").charAt(0).toUpperCase()}
                        </span>
                    </button>

                    {/* Dropdown Menu */}
                    {isProfileOpen && (
                        <div className="absolute top-12 right-0 w-48 bg-[#0B0F14]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-slide-down origin-top-right z-50">
                            <div className="px-4 py-3 border-b border-white/5 bg-white/5">
                                <p className="text-sm font-medium text-white truncate">{user?.username || "User"}</p>
                                <p className="text-xs text-slate-500 truncate">{user?.is_admin ? 'Administrator' : 'Viewer'}</p>
                            </div>
                            
                            <div className="p-1">
                                <button
                                    onClick={() => { setIsProfileOpen(false); navigate('/settings'); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-left"
                                >
                                    <Settings className="w-3.5 h-3.5" />
                                    Settings
                                </button>
                                <button
                                    onClick={() => { setIsProfileOpen(false); if(onLogout) onLogout(); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </header>
  );
};

export default TopBar;
