import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Activity,
  Camera,
  Clock,
  Filter,
  Search,
  X,
  AlertTriangle,
  Users,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { api, API_BASE, API_WS_BASE } from "../services/api";
import Skeleton from "../components/Skeleton";

// Helper: convert backend UTC timestamp to local time (IST, etc.)
const formatEventTime = (isoString) => {
  if (!isoString) return "N/A";

  const normalized =
    isoString.endsWith("Z") || isoString.includes("+")
      ? isoString
      : isoString + "Z";

  const date = new Date(normalized);

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

// ✅ Helper: convert "HH:00" label to 12-hour AM/PM
const formatHourToAMPM = (label) => {
  if (!label) return "";
  const [h] = label.split(":");
  let hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return label;

  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  hour = hour === 0 ? 12 : hour;

  return `${hour} ${ampm}`;
};

const Dashboard = () => {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    intrusionEvents: 0,
    lastEventTime: null,
    uniqueCameras: 0,
  });
  const [activeUsers, setActiveUsers] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [wsStatus, setWsStatus] = useState("disconnected");

  const navigate = useNavigate();

  // 1️⃣ Initial load from REST (events + stats + users)
  useEffect(() => {
    const loadInitial = async () => {
      try {
        setError(null);

        const [eventsData, statsData, usersData] = await Promise.all([
          api.fetchEvents(50),
          api.fetchEventStats(),
          api.fetchUserCount(),
        ]);

        setEvents(eventsData);

        const uniqueCameras = new Set(eventsData.map((e) => e.camera_id)).size;

        setStats({
          totalEvents: statsData.total_events,
          intrusionEvents: statsData.intrusion_events,
          lastEventTime: statsData.last_event_time,
          uniqueCameras,
        });

        setActiveUsers(usersData?.total_users ?? 0);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
        setError(err.message || "Failed to load dashboard data");
        setLoading(false);
      }
    };

    loadInitial();
  }, []);

  // 2️⃣ Live updates via WebSocket
  useEffect(() => {
    // ... existing websocket code ...
  }, []);


  useEffect(() => {
    const ws = new WebSocket(`${API_WS_BASE}/api/events/ws`);

    ws.onopen = () => {
      console.log("✅ dashboard ws connected");
      setWsStatus("connected");
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "new_event" && msg.event) {
          const newEvent = msg.event;

          // TRIGGER TOAST
          if (newEvent.event_type === 'intrusion') {
              addToast(`⚠️ Security Alert: Intrusion detected on ${newEvent.camera_id}`, 'error');
          } else {
               addToast(`Info: Activity detected on ${newEvent.camera_id}`, 'info');
          }

          setEvents((prev) => {
            if (prev.some((ev) => ev.id === newEvent.id)) return prev;

            const updated = [newEvent, ...prev].slice(0, 100);

            setStats((prevStats) => ({
              ...prevStats,
              totalEvents: prevStats.totalEvents + 1,
              intrusionEvents:
                prevStats.intrusionEvents +
                (newEvent.event_type === "intrusion" ? 1 : 0),
              lastEventTime: newEvent.timestamp || prevStats.lastEventTime,
              uniqueCameras: new Set(updated.map((e) => e.camera_id)).size,
            }));

            return updated;
          });
        }
      } catch (err) {
        console.error("WS parse error:", err);
      }
    };

    ws.onclose = () => {
      console.log("❌ dashboard ws closed");
      setWsStatus("disconnected");
    };

    ws.onerror = (err) => {
      console.error("⚠️ dashboard ws error", err);
      setWsStatus("disconnected");
    };

    return () => ws.close();
  }, []);

  // ---- Toasts Logic ----
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id) => {
      setToasts(prev => prev.filter(t => t.id !== id));
  };

  // ---- Filters ----
  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.camera_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      eventTypeFilter === "all" || event.event_type === eventTypeFilter;
    return matchesSearch && matchesType;
  });

  const eventTypes = ["all", ...new Set(events.map((e) => e.event_type))];

  // ============================================================
  // 📊 DATA FOR CHARTS
  // ============================================================

  const bucketMap = new Map();
  const cameraTotals = new Map();

  events.forEach((event) => {
    if (!event.timestamp) return;

    const raw = event.timestamp;
    const normalized = raw.endsWith("Z") || raw.includes("+") ? raw : raw + "Z";
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hour = String(d.getHours()).padStart(2, "0");

    const key = `${year}-${month}-${day} ${hour}`;
    const label = `${hour}:00`;

    const cameraId = event.camera_id || "Unknown";

    if (!bucketMap.has(key)) {
      bucketMap.set(key, {
        key,
        label,
        total: 0,
        perCamera: {},
      });
    }

    const bucket = bucketMap.get(key);
    bucket.total += 1;
    bucket.perCamera[cameraId] = (bucket.perCamera[cameraId] || 0) + 1;

    cameraTotals.set(cameraId, (cameraTotals.get(cameraId) || 0) + 1);
  });

  const sortedBuckets = Array.from(bucketMap.values()).sort((a, b) =>
    a.key.localeCompare(b.key)
  );

  const eventsOverTimeData = sortedBuckets.map((bucket) => ({
    label: bucket.label,
    total: bucket.total,
  }));

  const TOP_CAMERAS = 4;
  const topCameraIds = Array.from(cameraTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_CAMERAS)
    .map(([id]) => id);

  const eventsPerCameraData = sortedBuckets.map((bucket) => {
    const row = { label: bucket.label };
    topCameraIds.forEach((camId) => {
      row[camId] = bucket.perCamera[camId] || 0;
    });
    return row;
  });

  return (
    <div className="space-y-6 relative">
    
    {/* TOAST CONTAINER */}
    <div className="fixed top-24 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
            <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl animate-slide-in-right min-w-[300px] ${
                toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-200 shadow-red-500/10' : 'bg-[#0B0F14]/80 border-white/10 text-slate-200'
            }`}>
               {toast.type === 'error' ? <ShieldAlert className="w-5 h-5 text-red-400" /> : <Activity className="w-5 h-5 text-cyan-400" />}
               <div className="flex-1">
                   <p className="text-sm font-medium">{toast.message}</p>
               </div>
               <button onClick={() => removeToast(toast.id)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
        ))}
    </div>


      {/* Hero section removed (moved to TopBar) */}
      
      {/* Error banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-400 font-medium">Connection Error</h3>
            <p className="text-red-300/80 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Stat cards row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
           <>
              <Skeleton height="110px" className="w-full" />
              <Skeleton height="110px" className="w-full" />
              <Skeleton height="110px" className="w-full" />
              <Skeleton height="110px" className="w-full" />
           </>
        ) : (
            <>
                <StatCard
                title="Total Events"
                value={stats.totalEvents}
                icon={Activity}
                />
                <StatCard
                title="Active Cameras"
                value={stats.uniqueCameras}
                icon={Camera}
                accent="purple"
                />
                <StatCard
                title="Intrusion Alerts"
                value={stats.intrusionEvents}
                icon={AlertCircle}
                accent="red"
                />
                <StatCard
                title="Last Event"
                value={formatEventTime(stats.lastEventTime)}
                icon={Clock}
                accent="emerald"
                />
            </>
        )}
      </div>

      {/* 📊 Analytics row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
             <>
                 <Skeleton height="320px" className="w-full" />
                 <Skeleton height="320px" className="w-full" />
             </>
        ) : (
             <>
                <EventsOverTimeChart data={eventsOverTimeData} />
                <EventsPerCameraChart
                data={eventsPerCameraData}
                cameraIds={topCameraIds}
                />
             </>
        )}
      </div>

      {/* Main grid: events table + insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events table */}
        <div className="lg:col-span-2">
          <div className="rounded-xl glass-card overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-black/20">
              <h2 className="text-lg font-semibold text-slate-100">
                Security Events Timeline
              </h2>

              <div className="flex gap-3 w-full sm:w-auto">
                {/* Search */}
                <div className="flex-1 sm:flex-initial relative group">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-64 pl-9 pr-9 py-2 bg-[#0B0F14] border border-[#1F2430] rounded-lg text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter */}
                <div className="relative">
                  <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <select
                    value={eventTypeFilter}
                    onChange={(e) => setEventTypeFilter(e.target.value)}
                    className="pl-9 pr-8 py-2 bg-[#0B0F14] border border-[#1F2430] rounded-lg text-sm text-slate-300 focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
                  >
                    {eventTypes.map((type) => (
                      <option key={type} value={type}>
                        {type === "all"
                          ? "All Events"
                          : type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto flex-1 custom-scrollbar">
              {loading ? (
                <div className="p-4 space-y-3">
                   {[1,2,3,4,5].map(i => (
                       <Skeleton key={i} height="48px" className="w-full bg-white/5" />
                   ))}
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-3">
                    <AlertCircle className="w-6 h-6 text-slate-600" />
                  </div>
                  <p className="text-slate-400 font-medium">No events found</p>
                  <p className="text-slate-600 text-sm">Adjust your filters to see more.</p>
                </div>
              ) : (
                <table className="w-full border-separate border-spacing-y-1">
                  <thead className="text-xs uppercase tracking-wider text-slate-500 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 text-left font-medium bg-[#0B0F14]">Time</th>
                      <th className="px-6 py-4 text-left font-medium bg-[#0B0F14]">Camera</th>
                      <th className="px-6 py-4 text-left font-medium bg-[#0B0F14]">Type</th>
                      <th className="px-6 py-4 text-left font-medium bg-[#0B0F14]">Score</th>
                      <th className="px-6 py-4 text-left font-medium bg-[#0B0F14]">Description</th>
                      <th className="px-6 py-4 text-right font-medium bg-[#0B0F14]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((event) => (
                      <tr
                        key={event.id}
                        className="group bg-white/[0.01] hover:bg-white/[0.04] transition-all duration-300 hover:shadow-lg hover:shadow-black/20 hover:scale-[1.002] rounded-xl relative"
                      >
                        <td className="px-6 py-4 text-sm text-slate-300 font-mono first:rounded-l-xl last:rounded-r-xl border-t border-b border-l border-white/0 group-hover:border-white/5 first:border-l last:border-r">
                          {formatEventTime(event.timestamp)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-200 border-t border-b border-white/0 group-hover:border-white/5">
                            {event.camera_id}
                        </td>
                        <td className="px-6 py-4 border-t border-b border-white/0 group-hover:border-white/5">
                          <EventBadge type={event.event_type} />
                        </td>
                        <td className="px-6 py-4 border-t border-b border-white/0 group-hover:border-white/5">
                          {event.confidence ? (
                            <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-cyan-500 shadow-[0_0_8px_currentColor]" 
                                        style={{ width: `${event.confidence * 100}%` }}
                                    />
                                </div>
                                <span className="text-xs text-slate-400">
                                    {(event.confidence * 100).toFixed(0)}%
                                </span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400 max-w-xs truncate border-t border-b border-white/0 group-hover:border-white/5">
                          {event.description || "-"}
                        </td>
                        <td className="px-6 py-4 text-right first:rounded-l-xl last:rounded-r-xl border-t border-b border-r border-white/0 group-hover:border-white/5">
                          <div className="flex items-center justify-end gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                            {event.image_path && (
                              <a
                                href={`http://127.0.0.1:8000/${event.image_path}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 hover:bg-white/10 rounded-lg text-cyan-400 transition"
                                title="View Snapshot"
                              >
                                <Camera className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              onClick={() =>
                                navigate(`/live?camera=${event.camera_id}`)
                              }
                              className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-400 transition"
                              title="View Live"
                            >
                              <Activity className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Live Security Insights */}
        <div className="rounded-xl glass-card p-5 h-fit">
          <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Live Insights
          </h2>
          <div className="space-y-3">
            {events.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-2">
                  <EventBadge type={event.event_type} size="sm" />
                  <span className="text-xs text-slate-500 font-mono">
                    {formatEventTime(event.timestamp)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-200 font-medium">
                        {event.camera_id}
                    </p>
                    <span className="text-xs text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        View <Activity className="w-3 h-3" />
                    </span>
                </div>
                {event.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {event.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Flatter stat card with larger icon badge */
/** Flatter stat card with larger icon badge & neon glow */
const StatCard = ({ title, value, icon: Icon, accent = "blue" }) => {
  const accents = {
      blue: "from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/20 shadow-blue-900/20",
      red: "from-red-500/20 to-red-600/5 text-red-400 border-red-500/20 shadow-red-900/20",
      emerald: "from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/20 shadow-emerald-900/20",
      purple: "from-purple-500/20 to-purple-600/5 text-purple-400 border-purple-500/20 shadow-purple-900/20",
  };

  const colorClass = accents[accent] || accents.blue;
  const iconColor = colorClass.split(" ")[2]; // Extract text-color class

  return (
    <div className="group relative overflow-hidden rounded-2xl glass-card p-6 transition-all duration-500 hover:shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] border border-white/5 hover:border-white/10">
      
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400 mb-1 group-hover:text-slate-300 transition-colors">{title}</p>
          <span className="text-4xl font-bold text-slate-100 tracking-tight drop-shadow-lg">{value}</span>
        </div>

        <div
          className={`relative w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 backdrop-blur-md transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-[0_0_20px_-5px_currentColor] ${iconColor}`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
      
      {/* Decorative Glow */}
      <div className={`absolute -right-6 -bottom-6 w-32 h-32 rounded-full opacity-10 blur-3xl transition-all duration-700 group-hover:opacity-20 ${iconColor.replace('text-', 'bg-')}`} />
    </div>
  );
};

/* ---------- Charts ---------- */

const EventsOverTimeChart = ({ data }) => (
  <div className="rounded-2xl glass-card p-6 h-full flex flex-col relative overflow-hidden group">
    <div className="flex items-center justify-between mb-8 z-10">
      <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
        <Activity className="w-4 h-4 text-cyan-400" />
        Events Velocity
      </h3>
      <span className="text-[10px] font-mono px-2 py-1 rounded border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.1)]">
        LIVE
      </span>
    </div>

    {data.length === 0 ? (
      <div className="flex-1 flex items-center justify-center">
         <p className="text-sm text-slate-600 font-mono">-- No Signal --</p>
      </div>
    ) : (
      <div className="flex-1 min-h-[220px] relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
          >
             <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#0891b2" stopOpacity={0.3}/>
                </linearGradient>
            </defs>
            <CartesianGrid stroke="#1F2430" strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#64748B", fontSize: 10, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatHourToAMPM}
              dy={15}
            />
            <YAxis
              tick={{ fill: "#64748B", fontSize: 10, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(34, 211, 238, 0.05)' }}
              contentStyle={{
                backgroundColor: "rgba(2, 6, 23, 0.8)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(34, 211, 238, 0.2)",
                borderRadius: "12px",
                fontSize: "12px",
                boxShadow: "0 0 20px rgba(0, 0, 0, 0.5)",
                color: "#f1f5f9"
              }}
            />
            <Bar 
                dataKey="total" 
                fill="url(#barGradient)" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={50}
                className="hover:opacity-80 transition-opacity cursor-pointer drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

{/* ... existing code ... */}

const EventsPerCameraChart = ({ data, cameraIds }) => {
  const colors = ["#8b5cf6", "#10b981", "#06b6d4", "#f43f5e"];

  return (
    <div className="rounded-2xl glass-card p-6 h-full flex flex-col relative overflow-hidden">
      <div className="flex items-center justify-between mb-8 z-10">
        <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Camera className="w-4 h-4 text-purple-400" />
            Camera Activity
        </h3>
        <div className="flex -space-x-2">
            {cameraIds.map((id, idx) => (
                <div key={id} className="w-6 h-6 rounded-full border border-[#0B0F14] flex items-center justify-center text-[10px] font-bold text-[#0B0F14]" style={{ backgroundColor: colors[idx % colors.length] }}>
                    {id.charAt(0)}
                </div>
            ))}
        </div>
      </div>

      {data.length === 0 || cameraIds.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
             <p className="text-sm text-slate-600">No camera activity yet.</p>
        </div>
      ) : (
        <div className="flex-1 min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
            >
              <defs>
                 {colors.map((color, idx) => (
                     <linearGradient key={idx} id={`color${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={color} stopOpacity={0}/>
                     </linearGradient>
                 ))}
              </defs>
              <CartesianGrid stroke="#1F2430" strokeDasharray="3 3" vertical={false} opacity={0.5} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#64748B", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatHourToAMPM}
                dy={10}
              />
              <YAxis
                tick={{ fill: "#64748B", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(11, 15, 20, 0.8)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  fontSize: "12px",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                  color: "#f1f5f9",
                  padding: "12px"
                }}
                itemStyle={{ paddingBottom: '4px' }}
              />
              {cameraIds.map((camId, idx) => (
                <Area
                  key={camId}
                  type="monotone"
                  dataKey={camId}
                  name={camId}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#color${idx})`}
                  activeDot={{ r: 6, strokeWidth: 0, fill: colors[idx % colors.length], className: "animate-pulse" }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

const EventBadge = ({ type, size = "md" }) => {
  const badges = {
    intrusion: {
      color: "bg-red-500/10 text-red-400 border-red-500/30",
      label: "Intrusion",
    },
    loitering: {
      color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      label: "Loitering",
    },
    crowd: {
      color: "bg-purple-500/10 text-purple-400 border-purple-500/30",
      label: "Crowd",
    },
  };

  const badge = badges[type] || {
    color: "bg-slate-500/10 text-slate-400 border-slate-500/30",
    label: type,
  };

  const sizeClass = size === "sm" ? "text-xs px-2 py-1" : "text-sm px-3 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${sizeClass} rounded-full border font-medium ${badge.color}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {badge.label}
    </span>
  );
};

export default Dashboard;
