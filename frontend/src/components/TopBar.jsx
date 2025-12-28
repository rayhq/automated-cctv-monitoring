import React, { useState, useEffect, useRef } from "react";
import { Bell, Menu, Activity, Users, Zap, ChevronRight, ShieldAlert, PlusCircle, Settings, LogOut, User, X, AlertTriangle, CheckCircle, Clock, Search } from "lucide-react";
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
  const [tickerIndex, setTickerIndex] = useState(0);
  
  const profileRef = useRef(null);
  const notificationRef = useRef(null);
  const searchInputRef = useRef(null);

  // Derived State
  const hasIntrusion = notifications.some(n => n.event_type === 'intrusion' && (new Date() - new Date(n.timestamp)) < 300000); // Alert if intrusion in last 5 mins

  // Ticker Data (Mock Real-time stats)
  const tickerItems = [
      { icon: Activity, text: "System Online", color: "text-emerald-400" },
      { icon: CheckCircle, text: "Storage: 45% Free", color: "text-blue-400" },
      { icon: Zap, text: "Server Load: 12%", color: "text-violet-400" },
      ...(hasIntrusion ? [{ icon: ShieldAlert, text: "SECURITY ALERT ACTIVE", color: "text-red-500 font-bold animate-pulse" }] : [])
  ];

  // Ticker Rotation
  useEffect(() => {
      const interval = setInterval(() => {
          setTickerIndex(prev => (prev + 1) % tickerItems.length);
      }, 3000);
      return () => clearInterval(interval);
  }, [tickerItems.length]);

  // Keyboard Shortcut for Search
  useEffect(() => {
      const handleKeyDown = (e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
              e.preventDefault();
              searchInputRef.current?.focus();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        const fetchNotifs = () => {
             api.fetchEvents({ limit: 5 }).then(data => {
                 setNotifications(data || []);
            }).catch(err => console.error("Failed to fetch notifications", err));
        };
        
        fetchNotifs();
        const poll = setInterval(fetchNotifs, 10000); // Poll every 10s for alerts
        return () => clearInterval(poll);
    }
  }, [location.pathname, user]);

  const isDashboard = location.pathname === "/";
  const CurrentTickerIcon = tickerItems[tickerIndex].icon;

  return (
    <header className={`h-[72px] z-20 sticky top-0 px-6 w-full rounded-b-2xl backdrop-blur-xl shadow-lg flex items-center justify-between transition-all duration-500 group supports-[backdrop-filter]:bg-[#0B0F14]/30 ${hasIntrusion ? 'bg-red-950/20' : 'bg-[#0B0F14]/30'}`}>
        
        {/* REACTIVE BORDER: Red pulse on intrusion, Gradient on normal */}
        <div className={`absolute bottom-0 left-0 right-0 h-[1px] transition-all duration-1000 ${
            hasIntrusion 
                ? "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse" 
                : "bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-50 group-hover:opacity-100 group-hover:via-cyan-400/50"
        }`} />

        {/* Left: Mobile Toggle & Brand/Title */}
        <div className="flex items-center gap-5 h-full w-1/4">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg active:scale-95 transform"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Contextual Title */}
            {isDashboard ? (
                <div className="flex flex-col justify-center">
                    <h2 className="text-lg font-medium tracking-tight text-white/90 flex items-center gap-2">
                         <span className={hasIntrusion ? "text-red-400 animate-pulse font-bold" : "text-white font-semibold"}>
                            {hasIntrusion ? "⚠️ SYSTEM ALERT" : user?.username || 'User'}
                         </span>
                    </h2>
                     {!hasIntrusion && (
                        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                     )}
                </div>
            ) : (
                <h2 className="text-base font-bold text-slate-200 tracking-auto leading-none">
                     { location.pathname === '/live' ? 'Live Feed' :
                       location.pathname === '/events' ? 'Event History' :
                       location.pathname === '/cameras' ? 'Cameras' :
                       location.pathname === '/settings' ? 'Settings' : 'Dashboard' }
                </h2>
            )}
        </div>

        {/* Center: COMMAND BAR (Glass) */}
        <div className="hidden md:flex flex-1 justify-center max-w-lg">
            <div className={`relative w-full group transition-all duration-300 ${isNotificationsOpen || isProfileOpen ? 'opacity-50 blur-[2px]' : 'opacity-100'}`}>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <input
                    ref={searchInputRef}
                    type="text"
                    className="block w-full pl-10 pr-12 py-2 bg-white/5 border border-white/5 rounded-xl text-sm placeholder-slate-500 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:bg-white/10 transition-all shadow-inner"
                    placeholder="Search cameras, events..."
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-xs text-slate-600 font-mono border border-white/10 rounded px-1.5 py-0.5">⌘K</span>
                </div>
            </div>
        </div>

        {/* Right Section: UNIFIED CAPSULE + TICKER */}
        <div className="flex items-center justify-end w-1/4 ml-auto">
            <div className={`hidden md:flex items-center backdrop-blur-md rounded-full border p-1 pr-1.5 gap-1 shadow-lg transition-all duration-500 ${
                hasIntrusion ? "bg-red-950/60 border-red-500/30" : "bg-[#13151a]/60 border-white/5 shadow-black/20"
            }`}>
                
                {/* 1. DATA TICKER (Replaces Status) */}
                <div className="flex items-center gap-2 px-3 py-1.5 pr-4 border-r border-white/5 min-w-[160px]">
                     <div className="relative flex items-center justify-center w-4 h-4">
                        <CurrentTickerIcon className={`w-3.5 h-3.5 absolute transition-opacity duration-500 ${tickerItems[tickerIndex].color}`} />
                    </div>
                    <span className={`text-[10px] font-medium uppercase tracking-wider whitespace-nowrap transition-colors duration-300 ${tickerItems[tickerIndex].color}`}>
                        {tickerItems[tickerIndex].text}
                    </span>
                </div>

                {/* 2. Clock */}
                <div className="flex items-center gap-2 px-3 py-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-sm font-mono font-medium text-slate-300">
                        {time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit' })}
                    </span>
                </div>

                {/* 3. Actions Divider */}
                <div className="w-[1px] h-4 bg-white/5 mx-1"></div>

                {/* 4. Quick Actions */}
                 <button 
                     onClick={() => navigate('/cameras')}
                     className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                     title="Add Camera"
                 >
                     <PlusCircle className="w-4 h-4" />
                 </button>
                
                {/* Notification Bell */}
                <div className="relative" ref={notificationRef}>
                    <button 
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        className={`p-2 rounded-full transition-all relative ${isNotificationsOpen || hasIntrusion ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                    >
                        <Bell className={`w-4 h-4 ${hasIntrusion ? 'text-red-400 animate-wiggle' : ''}`} />
                        {(notifications.length > 0 || hasIntrusion) && (
                            <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-2 ring-[#0B0F14] animate-ping"></span>
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

                {/* Profile */}
                <div className="pl-1 relative" ref={profileRef}>
                    <button 
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center shadow-inner hover:ring-2 hover:ring-white/20 transition-all outline-none"
                    >
                         <span className="text-xs font-bold text-white">
                            {(user?.username || "A").charAt(0).toUpperCase()}
                        </span>
                    </button>

                    {/* Profile Menu */}
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
