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
} from "lucide-react";
import { api } from "../services/api";

// Helper: convert backend UTC timestamp to local time (IST, etc.)
const formatEventTime = (isoString) => {
  if (!isoString) return "N/A";

  // If backend sent naive datetime (no timezone), treat it as UTC
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

const Dashboard = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [cameras, setCameras] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setError(null);
        const data = await api.fetchEvents(50);
        setEvents(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    const loadCameras = async () => {
      try {
        const cams = await api.fetchCameras();
        setCameras(cams);
      } catch (err) {
        console.error("Failed to load cameras", err);
      }
    };

    loadEvents();
    loadCameras();

    const interval = setInterval(loadEvents, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.camera_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      eventTypeFilter === "all" || event.event_type === eventTypeFilter;
    return matchesSearch && matchesType;
  });

  const stats = {
    totalEvents: events.length,
    uniqueCameras: cameras.filter((c) => c.is_active).length,
    intrusionEvents: events.filter((e) => e.event_type === "intrusion").length,
    lastEventTime: events[0]?.timestamp || "N/A",
  };

  const eventTypes = ["all", ...new Set(events.map((e) => e.event_type))];

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-in]">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-xl p-8 border border-slate-700/50 shadow-2xl shadow-cyan-500/5 hover:shadow-cyan-500/10 transition-all duration-300">
        <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
          Smart Campus CCTV Monitoring
        </h1>
        <p className="text-slate-400 text-lg">
          Real-time AI-assisted surveillance dashboard
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3 shadow-lg shadow-red-500/10 backdrop-blur-sm animate-[slideDown_0.3s_ease-out]">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-400 font-medium">Connection Error</h3>
            <p className="text-red-300/80 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Events"
          value={stats.totalEvents}
          icon={<Activity className="w-6 h-6" />}
          color="cyan"
        />
        <StatCard
          title="Active Cameras"
          value={stats.uniqueCameras}
          icon={<Camera className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Intrusion Alerts"
          value={stats.intrusionEvents}
          icon={<AlertCircle className="w-6 h-6" />}
          color="red"
        />
        <StatCard
          title="Last Event"
          value={formatEventTime(stats.lastEventTime)}
          icon={<Clock className="w-6 h-6" />}
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events Table */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-800/50 overflow-hidden shadow-2xl shadow-slate-950/20 hover:shadow-slate-950/40 transition-all duration-300">
            <div className="p-6 border-b border-slate-800/50 bg-gradient-to-r from-slate-900/50 to-slate-800/50">
              <h2 className="text-xl font-semibold text-white mb-4">
                Security Events Timeline
              </h2>

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="flex-1 relative group">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search by camera or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-800/70 backdrop-blur-sm border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 focus:bg-slate-800 transition-all duration-200"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-all duration-200 hover:scale-110"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filter */}
                <div className="relative group">
                  <Filter className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
                  <select
                    value={eventTypeFilter}
                    onChange={(e) => setEventTypeFilter(e.target.value)}
                    className="pl-10 pr-8 py-2.5 bg-slate-800/70 backdrop-blur-sm border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 focus:bg-slate-800 transition-all duration-200 appearance-none cursor-pointer hover:border-slate-600"
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
                <div className="p-12 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-slate-700 border-t-cyan-500 rounded-full animate-spin"></div>
                  <p className="text-slate-400 mt-4">Loading events...</p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="p-12 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No events found</p>
                </div>
              ) : (
                <div className="relative">
                  <table className="w-full">
                    <thead className="bg-slate-800/70 backdrop-blur-sm text-slate-400 text-sm sticky top-0 z-10 shadow-md">
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
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredEvents.map((event, index) => (
                        <tr
                          key={event.id}
                          className="hover:bg-slate-800/40 transition-all duration-200 group animate-[fadeIn_0.3s_ease-in]"
                          style={{ animationDelay: `${index * 0.03}s` }}
                        >
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors">
                            {formatEventTime(event.timestamp)}
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-white">
                              {event.camera_id}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <EventBadge type={event.event_type} />
                          </td>
                          <td className="px-6 py-4">
                            {event.confidence ? (
                              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                                {(event.confidence * 100).toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-sm text-slate-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300 max-w-xs truncate group-hover:text-white transition-colors">
                            {event.description || "-"}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {event.image_path ? (
                                <a
                                  href={`http://127.0.0.1:8000/${event.image_path}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-all duration-200 hover:scale-105 inline-block"
                                >
                                  Snapshot
                                </a>
                              ) : (
                                <span className="text-slate-500 text-sm">
                                  -
                                </span>
                              )}

                              <button
                                onClick={() =>
                                  navigate(`/live?camera=${event.camera_id}`)
                                }
                                className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-all duration-200 hover:scale-105"
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
        <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-800/50 p-6 h-fit shadow-2xl shadow-slate-950/20 hover:shadow-slate-950/40 transition-all duration-300">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
            Live Security Insights
          </h2>
          <div className="space-y-3">
            {events.slice(0, 5).map((event, index) => (
              <div
                key={event.id}
                className="p-4 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/70 hover:shadow-lg hover:shadow-slate-950/20 transition-all duration-200 hover:scale-[1.02] cursor-pointer animate-[fadeIn_0.4s_ease-in] group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <EventBadge type={event.event_type} size="sm" />
                  <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                    {formatEventTime(event.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-slate-300 mb-1">
                  <span className="font-medium text-white">
                    {event.camera_id}
                  </span>
                </p>
                {event.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 group-hover:text-slate-300 transition-colors">
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

const StatCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    cyan: "from-cyan-500 to-blue-500",
    blue: "from-blue-500 to-indigo-500",
    red: "from-red-500 to-pink-500",
    emerald: "from-emerald-500 to-teal-500",
  };

  const shadowClasses = {
    cyan: "shadow-cyan-500/20 group-hover:shadow-cyan-500/40",
    blue: "shadow-blue-500/20 group-hover:shadow-blue-500/40",
    red: "shadow-red-500/20 group-hover:shadow-red-500/40",
    emerald: "shadow-emerald-500/20 group-hover:shadow-emerald-500/40",
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-800/50 p-6 hover:border-slate-700 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-slate-950/30 cursor-pointer group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium mb-2 group-hover:text-slate-300 transition-colors">
            {title}
          </p>
          <p className="text-3xl font-bold text-white group-hover:scale-105 transition-transform origin-left">
            {value}
          </p>
        </div>
        <div
          className={`w-12 h-12 bg-gradient-to-br ${colorClasses[color]} rounded-lg flex items-center justify-center shadow-lg ${shadowClasses[color]} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

const EventBadge = ({ type, size = "md" }) => {
  const badges = {
    intrusion: {
      color: "bg-red-500/10 text-red-400 border-red-500/30 shadow-red-500/10",
      label: "Intrusion",
    },
    loitering: {
      color:
        "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-amber-500/10",
      label: "Loitering",
    },
    crowd: {
      color:
        "bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-purple-500/10",
      label: "Crowd",
    },
  };

  const badge = badges[type] || {
    color:
      "bg-slate-500/10 text-slate-400 border-slate-500/30 shadow-slate-500/10",
    label: type,
  };
  const sizeClass = size === "sm" ? "text-xs px-2 py-1" : "text-sm px-3 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${sizeClass} rounded-full border font-medium ${badge.color} shadow-md hover:scale-105 transition-transform duration-200`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
      {badge.label}
    </span>
  );
};

export default Dashboard;
