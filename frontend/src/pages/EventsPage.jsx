import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Grid,
  List as ListIcon,
  Calendar,
  Download,
  AlertTriangle,
  Clock,
  Camera,
  Eye
} from "lucide-react";
import { api, API_BASE } from "../services/api";
import Skeleton from "../components/Skeleton";

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  
  // Filters
  const [filters, setFilters] = useState({
      searchTerm: "",
      type: "all",
      camera: "all",
      startDate: "",
      endDate: ""
  });

  const [pagination, setPagination] = useState({ limit: 20, skip: 0 });

  // Initial load & Filter change effect
  useEffect(() => {
    // Reset pagination when filters change
    setPagination({ limit: 20, skip: 0 });
    setHasMore(true);
    setEvents([]); 
    loadEvents(true);
  }, [filters.searchTerm, filters.type, filters.camera, filters.startDate, filters.endDate]);

  const loadEvents = async (isReset = false) => {
    try {
      if (isReset) setLoading(true);
      else setLoadingMore(true);

      const params = {
          limit: pagination.limit,
          skip: isReset ? 0 : pagination.skip,
          start_date: filters.startDate || undefined,
          end_date: filters.endDate || undefined,
          event_type: filters.type === 'all' ? undefined : filters.type,
          camera_id: filters.camera === 'all' ? undefined : filters.camera
      };
      
      // Simple client-side search simulation for now or if backend supports it
      // Note: We are just fetching sorted by time from backend
      
      const data = await api.fetchEvents(params);
      
      if (data.length < pagination.limit) {
          setHasMore(false);
      }

      setEvents(prev => isReset ? data : [...prev, ...data]);
      
      // Update skip for next load
      if (!isReset) {
        setPagination(prev => ({ ...prev, skip: prev.skip + prev.limit }));
      } else {
        setPagination(prev => ({ ...prev, skip: prev.limit }));
      }

    } catch (err) {
      console.error("Failed to load events", err);
    } finally {
      if (isReset) setLoading(false);
      else setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    loadEvents(false);
  };
  
  // NOTE: In a real app, you'd fetch unique filter options from backend
  const eventTypes = ["all", "intrusion", "person", "phone"]; 
  const cameras = ["all", "cam-01", "cam-02", "entrance", "lobby"]; 

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-10">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Event History</h1>
          <p className="text-slate-400 text-sm">Review security anomalies and detection snapshots</p>
        </div>
        
        <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg glass-card hover:bg-white/10 text-slate-300 transition-colors" title="Export CSV">
                <Download className="w-4 h-4" />
            </button>
            <div className="glass-card p-1 rounded-lg flex items-center">
                <button 
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <Grid className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <ListIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="glass-card p-4 rounded-xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Date Filters */}
        <div className="flex items-center gap-2 col-span-1 md:col-span-2">
            <div className="relative flex-1">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                 <input 
                    type="date"
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                    value={filters.startDate}
                    onChange={e => setFilters(prev => ({...prev, startDate: e.target.value}))}
                 />
            </div>
            <span className="text-slate-500 text-sm">to</span>
            <div className="relative flex-1">
                 <input 
                    type="date"
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                    value={filters.endDate}
                    onChange={e => setFilters(prev => ({...prev, endDate: e.target.value}))}
                 />
            </div>
        </div>

        {/* Camera Filter */}
        <div className="relative">
            <Camera className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <select 
                value={filters.camera}
                onChange={(e) => setFilters(prev => ({...prev, camera: e.target.value}))}
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
            >
                {cameras.map(cam => (
                    <option key={cam} value={cam}>
                        {cam === 'all' ? 'All Cameras' : cam}
                    </option>
                ))}
            </select>
        </div>

        {/* Type Filter */}
        <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <select 
                value={filters.type}
                onChange={(e) => setFilters(prev => ({...prev, type: e.target.value}))}
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
            >
                {eventTypes.map(type => (
                    <option key={type} value={type}>
                        {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                ))}
            </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
         viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                 {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} height="280px" className="rounded-xl bg-white/5" />)}
            </div>
        ) : (
            <div className="space-y-3">
                {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} height="64px" className="rounded-lg bg-white/5" />)}
            </div>
        )
      ) : events.length === 0 ? (
        <div className="py-20 text-center glass-card rounded-xl">
            <AlertTriangle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 font-medium">No events found</p>
            <p className="text-slate-500 text-sm">Try adjusting your filters</p>
        </div>
      ) : (
        <>
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {events.map(event => (
                        <EventCard key={event.id} event={event} />
                    ))}
                </div>
            ) : (
                <div className="glass-card rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900/50 text-slate-400 font-medium border-b border-slate-700/50">
                            <tr>
                                <th className="px-6 py-4">Reference</th>
                                <th className="px-6 py-4">Camera</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Confidence</th>
                                <th className="px-6 py-4">Time</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/30">
                            {events.map(event => (
                                <tr key={event.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4 font-mono text-slate-500">#{event.id}</td>
                                    <td className="px-6 py-4 text-slate-200 font-medium">{event.camera_id}</td>
                                    <td className="px-6 py-4">
                                        <Badge type={event.event_type} />
                                    </td>
                                    <td className="px-6 py-4 text-slate-400">{(event.confidence * 100).toFixed(1)}%</td>
                                    <td className="px-6 py-4 text-slate-400">{new Date(event.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        {event.image_path && (
                                            <a 
                                                href={`${API_BASE}/${event.image_path}`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium text-xs bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20"
                                            >
                                                <Eye className="w-3 h-3" /> View
                                            </a>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Load More Trigger */}
            {hasMore    && (
                <div className="flex justify-center pt-6">
                    <button 
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="px-6 py-2 rounded-full glass-card hover:bg-white/10 text-slate-300 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {loadingMore ? "Loading..." : "Load More Events"}
                    </button>
                </div>
            )}
        </>
      )}
    </div>
  );
};

const EventCard = ({ event }) => {
    return (
        <div className="glass-card rounded-xl overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
            {/* Image Header */}
            <div className="aspect-video bg-slate-900 relative overflow-hidden">
                {event.image_path ? (
                    <img 
                        src={`${API_BASE}/${event.image_path}`} 
                        alt="Event Snapshot" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Camera className="w-8 h-8" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                
                <div className="absolute top-3 right-3">
                    <Badge type={event.event_type} />
                </div>
                
                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                    <div>
                        <p className="text-white font-medium text-sm flex items-center gap-1.5">
                            <Camera className="w-3 h-3 text-slate-400" />
                            {event.camera_id}
                        </p>
                        <p className="text-slate-300 text-xs mt-0.5 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(event.timestamp).toLocaleTimeString()}
                        </p>
                    </div>
                    {event.confidence && (
                        <div className="text-right">
                             <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                {(event.confidence * 100).toFixed(0)}%
                             </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Body */}
            <div className="p-4">
                <p className="text-sm text-slate-300 line-clamp-2 min-h-[40px]">
                    {event.description || "No description provided by AI."}
                </p>
                
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-mono">
                        {new Date(event.timestamp).toLocaleDateString()}
                    </span>
                    {event.image_path && (
                         <a 
                            href={`${API_BASE}/${event.image_path}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                         >
                            View Full <Eye className="w-3 h-3" />
                         </a>
                    )}
                </div>
            </div>
        </div>
    );
};

const Badge = ({ type }) => {
    const styles = {
        intrusion: "bg-red-500/20 text-red-300 border-red-500/30",
        phone: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        default: "bg-slate-500/20 text-slate-300 border-slate-500/30"
    };

    // Simple mapping to handle different lowercase/uppercase or mapped types
    const key = type?.toLowerCase().includes("mobile") ? "phone" 
              : type?.toLowerCase() || "default";

    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[key] || styles.default}`}>
            {type}
        </span>
    );
}

export default EventsPage;
