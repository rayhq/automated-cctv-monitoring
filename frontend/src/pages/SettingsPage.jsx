// src/pages/SettingsPage.jsx
import React, { useState } from "react";
import { api } from "../services/api";
import {
  AlertTriangle,
  Lock,
  Database,
  Bell,
  User,
  ShieldCheck,
  Mail,
  Smartphone,
  Camera,
  HardDrive,
  Monitor,
  Moon,
  Sun,
  Upload,
  Cpu
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const tabs = ["Notifications", "System", "Data", "Security"];

const SettingsPage = () => {
  const { logout } = useAuth(); // Assuming 'user' might be available, otherwise we default
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("Notifications");

  const [loading, setLoading] = useState(false);
  const [dangerLoading, setDangerLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Security State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");


  // System State
  const [system, setSystem] = useState({
    retentionDays: 14,
    streamQuality: "High",
    theme: "Dark",
    autoUpdate: true,
  });

  const [notifications, setNotifications] = useState({
    emailAlerts: false,
    pushNotifications: true,
    sensitivity: 85,
    cooldown: 5,
    discordEnabled: false,
    discordWebhookUrl: ""
  });

  // Load Settings on Mount
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const settings = await api.getSettings();
        setSystem({
            retentionDays: settings.retentionDays || 14,
            streamQuality: settings.streamQuality || "High",
            theme: settings.theme || "Dark",
            autoUpdate: settings.autoUpdate
        });
        setNotifications({
            emailAlerts: settings.emailAlerts,
            pushNotifications: settings.pushNotifications,
            sensitivity: settings.sensitivity,
            cooldown: settings.cooldown,
            discordEnabled: settings.discordEnabled,
            discordWebhookUrl: settings.discordWebhookUrl
        });
        
        // Mock loading user profile from auth context or local storage if exists
        // Ideally we would fetch /me here but for now we trust the auth context or just mocks

      } catch (err) {
        console.error("Failed to load settings", err);
      }
    };
    loadData();
  }, []);

  // 🔐 Change password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (newPassword !== confirmNewPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.changePassword(currentPassword, newPassword);

      setMessage(res.detail || "Password updated successfully.");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");

      // Optional: don't logout immediately, or give user a choice
      setTimeout(async () => {
         await logout();
         navigate("/login", {
           replace: true,
           state: { passwordChanged: true },
         });
      }, 2000);
      
    } catch (err) {
      setError(err.message || "Failed to change password.");
      setLoading(false);
    } 
  };

  // 🗑 Delete all events
  const handleResetEvents = async () => {
    if (
      !window.confirm(
        "This will DELETE ALL EVENTS.\nThis action CANNOT be undone.\n\nProceed?"
      )
    ) {
      return;
    }

    try {
      setDangerLoading(true);
      setError(null);
      setMessage(null);

      const res = await api.resetEvents();
      setMessage(res.detail || "All events deleted successfully.");
    } catch (err) {
      setError(err.message || "Failed to delete events.");
    } finally {
      setDangerLoading(false);
    }
  };

  // 💾 Save Generic Settings
  const handleSaveSettings = async () => {
      setSaveLoading(true);
      setMessage(null);
      try {
          // 1. Save System Settings
          const payload = {
              ...system,
              ...notifications
          };
          await api.updateSettings(payload);



          setMessage("Settings saved successfully.");
          setTimeout(() => setMessage(null), 3000);
      } catch (err) {
          setError("Failed to save settings.");
          console.error(err);
      } finally {
          setSaveLoading(false);
      }
  }

  // 💡 Password strength (visual only)
  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: "Start typing...", barClass: "w-0" };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    switch (score) {
      case 1:
        return { score, label: "Weak", barClass: "w-1/4 bg-red-500" };
      case 2:
        return { score, label: "Okay", barClass: "w-2/4 bg-amber-400" };
      case 3:
        return { score, label: "Good", barClass: "w-3/4 bg-lime-400" };
      case 4:
        return { score, label: "Strong", barClass: "w-full bg-emerald-400" };
      default:
        return { score: 0, label: "Start typing...", barClass: "w-0" };
    }
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <div className="px-6 py-6 space-y-6 text-white max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <p className="text-sm font-medium text-cyan-400 mb-1">System Configuration</p>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Settings
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl">
            Manage your profile, configure system parameters, and secure your dashboard.
            </p>
        </div>
        {/* Simple Status Badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Online
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
                px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${activeTab === tab 
                    ? "bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/50 shadow-[0_0_15px_rgba(6_182_212_0.15)]" 
                    : "text-slate-400 hover:text-white hover:bg-white/5"}
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-12">
            

            {/* --- NOTIFICATIONS TAB --- */}
            {activeTab === "Notifications" && (
                <div className="space-y-6 animate-fade-in max-w-3xl">
                    <GlassCard>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400">
                                <Bell className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">Notification Preferences</h2>
                                <p className="text-sm text-slate-400">Control how and when you receive alerts.</p>
                            </div>
                        </div>
                        
                        <div className="space-y-6">
                            {/* Channels */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                                    <div className="flex items-center gap-4">
                                        <Mail className="w-5 h-5 text-slate-400" />
                                        <div>
                                            <p className="font-medium">Email Alerts</p>
                                            <p className="text-xs text-slate-400">Receive daily summaries and critical alerts</p>
                                        </div>
                                    </div>
                                    <ToggleSwitch 
                                        checked={notifications.emailAlerts} 
                                        onChange={() => setNotifications(prev => ({...prev, emailAlerts: !prev.emailAlerts}))} 
                                    />
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                                    <div className="flex items-center gap-4">
                                        <Smartphone className="w-5 h-5 text-slate-400" />
                                        <div>
                                            <p className="font-medium">Push Notifications</p>
                                            <p className="text-xs text-slate-400">Instant alerts to your browser/device</p>
                                        </div>
                                    </div>
                                    <ToggleSwitch 
                                        checked={notifications.pushNotifications} 
                                        onChange={() => setNotifications(prev => ({...prev, pushNotifications: !prev.pushNotifications}))} 
                                    />
                                </div>
                            </div>

                            {/* Sliders */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                <div className="p-4 rounded-xl bg-slate-900/30 border border-white/5 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-slate-300">Motion Sensitivity</span>
                                        <span className="text-xs font-mono text-cyan-400 bg-cyan-900/20 px-2 py-0.5 rounded">{notifications.sensitivity}%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" max="100" 
                                        value={notifications.sensitivity}
                                        onChange={(e) => setNotifications(prev => ({...prev, sensitivity: parseInt(e.target.value)}))}
                                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400" 
                                    />
                                    <p className="text-[10px] text-slate-500">Threshold for triggering motion events.</p>
                                </div>

                                <div className="p-4 rounded-xl bg-slate-900/30 border border-white/5 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-slate-300">Alert Cooldown</span>
                                        <span className="text-xs font-mono text-cyan-400 bg-cyan-900/20 px-2 py-0.5 rounded">{notifications.cooldown} min</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1" max="60" 
                                        value={notifications.cooldown}
                                        onChange={(e) => setNotifications(prev => ({...prev, cooldown: parseInt(e.target.value)}))}
                                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400" 
                                    />
                                    <p className="text-[10px] text-slate-500">Wait time between consecutive alerts.</p>
                                </div>
                            </div>
                            
                            {/* Divider */}
                            <div className="h-px bg-white/5 my-6" />

                            {/* Discord Integration */}
                            <div>
                                 <div className="flex items-center justify-between p-4 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/20 transition-all mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center text-white">
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 14.155 14.155 0 0 0-.64 1.325 18.256 18.256 0 0 0-7.398 0 13.9 13.9 0 0 0-.645-1.325.074.074 0 0 0-.078-.037 19.792 19.792 0 0 0-4.886 1.516.07.07 0 0 0-.03.027c-3.11 4.63-3.978 9.155-3.568 13.626.002.046.023.089.057.114 2.454 1.794 4.814 2.873 7.086 3.557a.08.08 0 0 0 .079-.026 14.288 14.288 0 0 0 1.487-2.396.076.076 0 0 0-.041-.106 9.38 9.38 0 0 1-2.126-1.01.074.074 0 0 1-.005-.123c.129-.095.257-.194.381-.296a.074.074 0 0 1 .077-.012 16.517 16.517 0 0 0 9.878 0 .074.074 0 0 1 .078.01c.124.103.251.201.382.296a.074.074 0 0 1-.005.123 9.4 9.4 0 0 1-2.126 1.01.076.076 0 0 0-.041.106 14.288 14.288 0 0 0 1.488 2.396.078.078 0 0 0 .078.027c2.274-.684 4.634-1.764 7.09-3.558a.078.078 0 0 0 .056-.114c.46-5.06-1.284-9.673-3.99-13.654a.07.07 0 0 0-.03-.027ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-medium text-[#5865F2]">Discord Integration</p>
                                            <p className="text-xs text-slate-400">Send rich alerts to channel</p>
                                        </div>
                                    </div>
                                    <ToggleSwitch
                                        checked={notifications.discordEnabled}
                                        onChange={() => setNotifications(prev => ({...prev, discordEnabled: !prev.discordEnabled}))}
                                    />
                                </div>
                                
                                {notifications.discordEnabled && (
                                    <div className="space-y-4 p-4 rounded-xl bg-slate-900/30 border border-white/5 animate-fade-in">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-400 uppercase">Webhook URL</label>
                                            <input 
                                                value={notifications.discordWebhookUrl}
                                                onChange={(e) => setNotifications({...notifications, discordWebhookUrl: e.target.value})}
                                                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#5865F2]/50 focus:ring-1 focus:ring-[#5865F2]/50 outline-none"
                                                placeholder="https://discord.com/api/webhooks/..."
                                            />
                                            <p className="text-[10px] text-slate-500">Paste your Discord Channel Webhook URL here.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Save Button for Notifications */}
                            <div className="flex justify-end pt-4 border-t border-white/5">
                                <SaveButton loading={saveLoading} onClick={handleSaveSettings} />
                            </div>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* --- SYSTEM TAB --- */}
            {activeTab === "System" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    {/* Storage Config */}
                    <GlassCard>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                                <HardDrive className="w-5 h-5" />
                            </div>
                            <h3 className="font-semibold text-lg">Storage & Retention</h3>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Retention Period</span>
                                    <span className="text-emerald-400">{system.retentionDays} Days</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="1" max="90" 
                                    value={system.retentionDays}
                                    onChange={(e) => setSystem({...system, retentionDays: parseInt(e.target.value)})}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                                />
                                <div className="flex justify-between text-[10px] text-slate-500 px-1">
                                    <span>1 Day</span>
                                    <span>90 Days</span>
                                </div>
                            </div>
                            
                            <div className="p-4 rounded-lg bg-slate-900/50 border border-white/5 flex items-center gap-3">
                                <Database className="w-8 h-8 text-slate-600" />
                                <div>
                                    <p className="text-xs font-medium text-slate-300">Storage Usage</p>
                                    <div className="w-48 h-2 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                                        <div className="h-full bg-emerald-500 w-[65%]" />
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1">1.2TB used of 2TB (65%)</p>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Video Config */}
                    <GlassCard>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                                <Monitor className="w-5 h-5" />
                            </div>
                            <h3 className="font-semibold text-lg">Video Defaults</h3>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400 uppercase">Stream Quality</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {["Low", "Medium", "High"].map(quality => (
                                        <button 
                                            key={quality}
                                            onClick={() => setSystem({...system, streamQuality: quality})}
                                            className={`
                                                py-2 rounded-lg text-sm font-medium border
                                                ${system.streamQuality === quality 
                                                    ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" 
                                                    : "bg-transparent border-white/10 text-slate-400 hover:bg-white/5"}
                                            `}
                                        >
                                            {quality}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400 uppercase">Appearance</label>
                                <div className="grid grid-cols-3 gap-2">
                                     <button onClick={() => setSystem({...system, theme: "Light"})} className={`py-2 flex justify-center rounded-lg border ${system.theme === "Light" ? "bg-white/10 border-white/40 text-white" : "border-white/5 text-slate-500"}`}>
                                         <Sun className="w-4 h-4" />
                                     </button>
                                     <button onClick={() => setSystem({...system, theme: "Dark"})} className={`py-2 flex justify-center rounded-lg border ${system.theme === "Dark" ? "bg-white/10 border-white/40 text-white" : "border-white/5 text-slate-500"}`}>
                                         <Moon className="w-4 h-4" />
                                     </button>
                                     <button onClick={() => setSystem({...system, theme: "System"})} className={`py-2 flex justify-center rounded-lg border ${system.theme === "System" ? "bg-white/10 border-white/40 text-white" : "border-white/5 text-slate-500"}`}>
                                         <Monitor className="w-4 h-4" />
                                     </button>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                    
                     {/* Hardware Info */}
                     <GlassCard className="md:col-span-2">
                        <div className="flex items-center gap-3 mb-4">
                            <Cpu className="w-5 h-5 text-slate-400" />
                            <h3 className="font-semibold text-lg">System Hardware</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-3 bg-slate-900/40 rounded-lg border border-white/5">
                                <p className="text-[10px] text-slate-500 uppercase">CPU Usage</p>
                                <p className="text-lg font-mono text-emerald-400">12%</p>
                            </div>
                            <div className="p-3 bg-slate-900/40 rounded-lg border border-white/5">
                                <p className="text-[10px] text-slate-500 uppercase">Memory</p>
                                <p className="text-lg font-mono text-cyan-400">4.2GB / 16GB</p>
                            </div>
                            <div className="p-3 bg-slate-900/40 rounded-lg border border-white/5">
                                <p className="text-[10px] text-slate-500 uppercase">Uptime</p>
                                <p className="text-lg font-mono text-white">4d 12h 30m</p>
                            </div>
                            <div className="p-3 bg-slate-900/40 rounded-lg border border-white/5">
                                <p className="text-[10px] text-slate-500 uppercase">Version</p>
                                <p className="text-lg font-mono text-slate-300">v2.4.0</p>
                            </div>
                        </div>
                     </GlassCard>
                </div>
            )}


            {/* --- SECURITY TAB --- */}
            {activeTab === "Security" && (
                <div className="max-w-2xl animate-fade-in">
                    <GlassCard accent="blue">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-cyan-400" />
                            <h2 className="text-lg font-semibold">Security Settings</h2>
                        </div>
                        <p className="text-slate-400 text-sm">
                            Change your admin password. You&apos;ll be signed out after a successful update.
                        </p>
                        </div>

                        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
                        <ShieldCheck className="w-3 h-3" />
                        Admin only
                        </span>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-5">
                        {/* Current password */}
                        <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-300">
                            Current password
                        </label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="
                            w-full
                            px-3 py-2.5
                            rounded-lg
                            bg-white/5
                            border border-white/15
                            backdrop-blur-md
                            text-white
                            placeholder:text-slate-400
                            focus:outline-none
                            focus:border-cyan-400/70
                            focus:ring-0
                            text-sm
                            "
                            placeholder="Enter your current password"
                            required
                        />
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-gradient-to-r from-transparent via-slate-500/40 to-transparent" />

                        {/* New password section */}
                        <div className="space-y-4">
                        <div>
                            <p className="text-xs font-medium text-slate-300">
                            Set a new password
                            </p>
                            <p className="text-[11px] text-slate-500">
                            Use a strong password with a mix of characters.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                            <label className="text-xs text-slate-400">
                                New password
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="
                                w-full
                                px-3 py-2.5
                                rounded-lg
                                bg-white/5
                                border border-white/15
                                backdrop-blur-md
                                text-white
                                placeholder:text-slate-400
                                focus:outline-none
                                focus:border-cyan-400/70
                                focus:ring-0
                                text-sm
                                "
                                placeholder="Create a strong password"
                                required
                            />
                            </div>

                            <div className="space-y-2">
                            <label className="text-xs text-slate-400">
                                Confirm new password
                            </label>
                            <input
                                type="password"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                className="
                                w-full
                                px-3 py-2.5
                                rounded-lg
                                bg-white/5
                                border border-white/15
                                backdrop-blur-md
                                text-white
                                placeholder:text-slate-400
                                focus:outline-none
                                focus:border-cyan-400/70
                                focus:ring-0
                                text-sm
                                "
                                placeholder="Re-type new password"
                                required
                            />
                            </div>
                        </div>

                        {/* Password strength */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Password strength</span>
                            <span
                                className={
                                strength.score >= 3
                                    ? "text-emerald-400"
                                    : strength.score === 0
                                    ? "text-slate-500"
                                    : "text-amber-300"
                                }
                            >
                                {strength.label}
                            </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${strength.barClass}`}
                            />
                            </div>
                        </div>
                        </div>

                        {/* Submit + messages */}
                        <div className="pt-1 space-y-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="
                            inline-flex items-center justify-center
                            px-5 py-2.5
                            rounded-lg
                            bg-cyan-400/90
                            hover:bg-cyan-400
                            text-black text-sm font-semibold
                            border border-cyan-300/60
                            shadow-inner
                            transition
                            disabled:opacity-60
                            "
                        >
                            {loading ? "Updating..." : "Update password"}
                        </button>

                        {message && (
                            <p className="text-sm text-emerald-400 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" />
                            {message}
                            </p>
                        )}
                        {error && (
                            <p className="text-sm text-red-400 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            {error}
                            </p>
                        )}
                        </div>
                    </form>
                    </GlassCard>
                </div>
            )}

            {/* --- DATA TAB --- */}
            {activeTab === "Data" && (
                <div
                    className="
                    relative
                    rounded-2xl
                    border border-red-500/40
                    bg-gradient-to-br from-red-950/60 to-red-900/40
                    backdrop-blur-xl
                    p-6
                    overflow-hidden
                    max-w-2xl
                    "
                >
                {/* Inner light only (no outer glow) */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-30" />

                <div className="relative z-10">
                    <h2 className="flex items-center gap-2 text-lg font-semibold mb-2 text-red-400">
                    <Database className="w-5 h-5" />
                    Data Management
                    </h2>

                    <p className="text-red-200 text-sm mb-4">
                    Delete all stored events and logs from the database. This is a destructive action used for system resets.
                    </p>

                    <div className="flex items-start gap-3 text-red-300 text-xs mb-6 p-4 rounded-lg bg-red-950/50 border border-red-500/20">
                        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                        <span>
                            <strong className="block mb-1 font-semibold text-red-200">Warning: Irreversible Action</strong>
                            This operation will permanently delete all recorded event history. Ensure you have backed up any necessary evidence before proceeding.
                        </span>
                    </div>

                    <button
                        onClick={handleResetEvents}
                        disabled={dangerLoading}
                        className="
                            px-5 py-2.5
                            rounded-lg
                            bg-red-600 hover:bg-red-700
                            text-white text-sm font-medium
                            border border-red-400/60
                            shadow-lg shadow-red-900/50
                            transition
                            disabled:opacity-60
                            flex items-center gap-2
                        "
                    >
                    <Database className="w-4 h-4" />
                    {dangerLoading ? "Deleting Data..." : "Delete All Events"}
                    </button>
                    
                    {message && <p className="mt-4 text-emerald-400 text-sm animate-pulse">{message}</p>}
                    {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
                </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

/* Glassmorphism Wrapper with optional className prop */
const GlassCard = ({ children, accent = "none", className = "" }) => {
  const accentBorder =
    accent === "blue" ? "border-cyan-400/40" : "border-white/10";

  return (
    <div
      className={`
        relative
        rounded-2xl
        border
        ${accentBorder}
        bg-gradient-to-br from-white/10 to-white/5
        backdrop-blur-xl
        p-6
        overflow-hidden
        ${className}
      `}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-40" />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

/* Reusable Switch Component */
const ToggleSwitch = ({ checked, onChange }) => {
    return (
        <button 
            onClick={onChange}
            className={`w-11 h-6 rounded-full relative transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500 ${checked ? 'bg-cyan-500' : 'bg-slate-700'}`}
        >
            <span 
                className={`block w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-1'}`} 
            />
        </button>
    );
};

/* Reusable Save Button */
const SaveButton = ({ loading, onClick }) => (
    <button 
        onClick={onClick}
        disabled={loading}
        className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
        {loading ? (
           <>Processing...</>
        ) : (
           <>Save Changes</>
        )}
    </button>
);

export default SettingsPage;
