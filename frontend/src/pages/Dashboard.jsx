// src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
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
import { api } from "../services/api";

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
    const ws = new WebSocket("ws://127.0.0.1:8000/api/events/ws");

    ws.onopen = () => {
      console.log("✅ dashboard ws connected");
      setWsStatus("connected");
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "new_event" && msg.event) {
          const newEvent = msg.event;

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
    <div className="space-y-5">
      {/* Small breadcrumb label */}
      <div>
        <p className="text-sm font-medium text-[#9CA3AF] mb-1">Dashboard</p>
      </div>

      {/* Compact hero / header bar */}
      <div className="rounded-xl border border-[#1F2430] bg-[#0B0F14] px-6 py-4 flex items-center justify-between gap-4 glow-hover">
        <div>
          <div className="inline-flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-[#1F2430] bg-[#050814] text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wide">
              Overview
            </span>
          </div>
          <h2 className="text-xl font-semibold text-[#E5E7EB]">
            Smart Campus CCTV Monitoring
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Real-time AI-assisted surveillance for your campus perimeter,
            corridors and common areas.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 text-xs">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
              wsStatus === "connected"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-[#374151] bg-[#111827] text-[#9CA3AF]"
            } font-medium`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                wsStatus === "connected" ? "bg-emerald-400" : "bg-[#6B7280]"
              } animate-pulse`}
            />
            {wsStatus === "connected"
              ? "Live monitoring"
              : "Waiting for live feed"}
          </span>

          {/* tiny Active Users pill */}
          {activeUsers != null && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#020617] border border-[#1F2430] text-[11px] text-[#9CA3AF]">
              <Users className="w-3 h-3 text-cyan-300" />
              <span>
                {activeUsers} active user{activeUsers === 1 ? "" : "s"}
              </span>
            </span>
          )}

          <span className="text-[#9CA3AF]">
            Latest events stream in{" "}
            <span className="font-semibold">instantly</span>
          </span>
        </div>
      </div>

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Events"
          value={stats.totalEvents}
          icon={Activity}
        />
        <StatCard
          title="Active Cameras"
          value={stats.uniqueCameras}
          icon={Camera}
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
        />
      </div>

      {/* 📊 Analytics row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EventsOverTimeChart data={eventsOverTimeData} />
        <EventsPerCameraChart
          data={eventsPerCameraData}
          cameraIds={topCameraIds}
        />
      </div>

      {/* Main grid: events table + insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Events table */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-[#1F2430] bg-[#0B0F14] overflow-hidden glow-hover">
            <div className="p-4 border-b border-[#1F2430]">
              <h2 className="text-lg font-semibold text-[#E5E7EB] mb-3">
                Security Events Timeline
              </h2>

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="flex-1 relative group glow-focus">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                  <input
                    type="text"
                    placeholder="Search by camera or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-[#0B0F14] border border-[#1F2430] rounded-lg text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:ring-0"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#E5E7EB] transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filter */}
                <div className="relative group glow-focus">
                  <Filter className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                  <select
                    value={eventTypeFilter}
                    onChange={(e) => setEventTypeFilter(e.target.value)}
                    className="pl-10 pr-8 py-2.5 bg-[#0B0F14] border border-[#1F2430] rounded-lg text-[#E5E7EB] focus:outline-none focus:ring-0 appearance-none cursor-pointer"
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

            <div className="overflow-x-auto max-h-[600px]">
              {loading ? (
                <div className="p-10 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-[#1F2430] border-t-cyan-500 rounded-full animate-spin" />
                  <p className="text-[#9CA3AF] mt-4">Loading events...</p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="p-10 text-center">
                  <AlertCircle className="w-12 h-12 text-[#4B5563] mx-auto mb-3" />
                  <p className="text-[#9CA3AF]">No events found</p>
                </div>
              ) : (
                <div className="relative">
                  <table className="w-full">
                    <thead className="bg-[#0B0F14] text-[#9CA3AF] text-sm sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left font-medium">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left font-medium">
                          Camera
                        </th>
                        <th className="px-6 py-3 text-left font-medium">
                          Event Type
                        </th>
                        <th className="px-6 py-3 text-left font-medium">
                          Confidence
                        </th>
                        <th className="px-6 py-3 text-left font-medium">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F2430]">
                      {filteredEvents.map((event) => (
                        <tr
                          key={event.id}
                          className="bg-[#0B0F14] hover:bg-[#101623] transition-colors"
                        >
                          <td className="px-6 py-3 text-sm text-[#E5E7EB]">
                            {formatEventTime(event.timestamp)}
                          </td>
                          <td className="px-6 py-3">
                            <span className="text-sm font-medium text-[#E5E7EB]">
                              {event.camera_id}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <EventBadge type={event.event_type} />
                          </td>
                          <td className="px-6 py-3">
                            {event.confidence ? (
                              <span className="text-sm text-[#E5E7EB]">
                                {(event.confidence * 100).toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-sm text-[#6B7280]">-</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-sm text-[#E5E7EB] max-w-xs truncate">
                            {event.description || "-"}
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              {event.image_path ? (
                                <a
                                  href={`http://127.0.0.1:8000/${event.image_path}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#3B82F6] hover:text-[#60A5FA] text-sm font-medium"
                                >
                                  Snapshot
                                </a>
                              ) : (
                                <span className="text-[#6B7280] text-sm">
                                  -
                                </span>
                              )}
                              <button
                                onClick={() =>
                                  navigate(`/live?camera=${event.camera_id}`)
                                }
                                className="text-[#22C55E] hover:text-[#4ADE80] text-sm font-medium"
                              >
                                View Live
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Security Insights */}
        <div className="rounded-xl border border-[#1F2430] bg-[#0B0F14] p-4 h-fit glow-hover">
          <h2 className="text-lg font-semibold text-[#E5E7EB] mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Live Security Insights
          </h2>
          <div className="space-y-2">
            {events.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="p-4 bg-[#0B0F14] rounded-lg border border-[#1F2430] glow-hover cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <EventBadge type={event.event_type} size="sm" />
                  <span className="text-xs text-[#9CA3AF]">
                    {formatEventTime(event.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-[#E5E7EB] mb-1">
                  <span className="font-medium">{event.camera_id}</span>
                </p>
                {event.description && (
                  <p className="text-xs text-[#9CA3AF] line-clamp-2">
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
const StatCard = ({ title, value, icon: Icon, accent = "blue" }) => {
  const accentColor =
    accent === "green"
      ? "bg-emerald-500/15 text-emerald-400"
      : accent === "red"
      ? "bg-red-500/15 text-red-400"
      : "bg-blue-500/15 text-blue-400";

  return (
    <div className="rounded-xl border border-[#1F2430] bg-[#0B0F14] p-5 flex items-center justify-between glow-hover">
      <div>
        <p className="text-sm font-medium text-[#9CA3AF] mb-1">{title}</p>
        <span className="text-3xl font-bold text-[#E5E7EB]">{value}</span>
      </div>

      <div
        className={`w-11 h-11 flex items-center justify-center rounded-lg ${accentColor}`}
      >
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
};

/* ---------- Charts ---------- */

const EventsOverTimeChart = ({ data }) => (
  <div className="rounded-xl border border-[#1F2430] bg-[#0B0F14] p-4 glow-hover">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-semibold text-[#E5E7EB]">
        Events over time
      </h3>
      <span className="text-[11px] text-[#6B7280]">By hour</span>
    </div>

    {data.length === 0 ? (
      <p className="text-xs text-[#6B7280] mt-6">Not enough data yet.</p>
    ) : (
      <div className="mt-2">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            margin={{ top: 10, right: 16, left: -20, bottom: 0 }}
          >
            <CartesianGrid stroke="#111827" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#6B7280", fontSize: 11 }}
              tickFormatter={formatHourToAMPM}
            />
            <YAxis
              tick={{ fill: "#6B7280", fontSize: 11 }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#020617",
                border: "1px solid #1F2430",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

const EventsPerCameraChart = ({ data, cameraIds }) => {
  const colors = ["#60a5fa", "#22c55e", "#a855f7", "#f97316"];

  return (
    <div className="rounded-xl border border-[#1F2430] bg-[#0B0F14] p-4 glow-hover">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-[#E5E7EB]">
          Events per camera
        </h3>
        <span className="text-[11px] text-[#6B7280]">
          Top cameras · by hour
        </span>
      </div>

      {data.length === 0 || cameraIds.length === 0 ? (
        <p className="text-xs text-[#6B7280] mt-6">No camera activity yet.</p>
      ) : (
        <div className="mt-2">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={data}
              margin={{ top: 10, right: 16, left: -20, bottom: 0 }}
            >
              <CartesianGrid stroke="#111827" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#6B7280", fontSize: 11 }}
                tickFormatter={formatHourToAMPM}
              />
              <YAxis
                tick={{ fill: "#6B7280", fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#020617",
                  border: "1px solid #1F2430",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              {cameraIds.map((camId, idx) => (
                <Area
                  key={camId}
                  type="monotone"
                  dataKey={camId}
                  name={camId}
                  stroke={colors[idx % colors.length]}
                  fill={colors[idx % colors.length]}
                  fillOpacity={0.2}
                  strokeWidth={2}
                  activeDot={{ r: 4 }}
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
