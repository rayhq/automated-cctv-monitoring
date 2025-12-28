import React, { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Camera, Grid, Maximize2, Minimize2, MoreVertical, Settings, LayoutGrid, Layout, Square, Circle, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Activity } from "lucide-react";
import { api, API_BASE } from "../services/api";

const BASE_STREAM_URL = `${API_BASE}/api/video/stream`;

const LiveView = () => {
  const [params] = useSearchParams();
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // View State
  const [layout, setLayout] = useState("grid-2"); // grid-1, grid-2, grid-3
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  const selectedCameraId = params.get("camera");

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const data = await api.fetchCameras();
        setCameras(data.filter((c) => c.is_active)); 
      } catch (err) {
        setError(err.message || "Failed to load cameras");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(err => console.error(err));
        setIsFullscreen(true);
    } else {
        document.exitFullscreen();
        setIsFullscreen(false);
    }
  };

  const getGridClass = () => {
      if (selectedCameraId) return "grid-cols-1";
      switch(layout) {
          case "grid-1": return "grid-cols-1";
          case "grid-3": return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
          default: return "grid-cols-1 md:grid-cols-2"; 
      }
  };

  if (loading) return <div className="p-10 text-center text-slate-500 animate-pulse">Initializing surveillance link...</div>;
  if (error) return <div className="p-10 text-center text-red-400">Connection Failed: {error}</div>;

  // Filter if specific camera selected
  const activeFeeds = selectedCameraId 
      ? cameras.filter(c => c.camera_id === selectedCameraId)
      : cameras;

  return (
    <div ref={containerRef} className={`flex flex-col h-full space-y-4 animate-[fadeIn_0.5s_ease-in] ${isFullscreen ? 'p-6 bg-[#02040a]' : ''}`}>
      
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-3 rounded-xl border border-white/5">
        <div>
           <h1 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                Live Monitoring
                <span className="text-xs font-normal text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                    {activeFeeds.length} Active Feeds
                </span>
           </h1>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
            {!selectedCameraId && (
                <div className="flex items-center p-1 bg-black/40 rounded-lg border border-white/5">
                    <button onClick={() => setLayout('grid-1')} className={`p-1.5 rounded-md transition-all ${layout === 'grid-1' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`} title="Single View">
                        <Square className="w-4 h-4" />
                    </button>
                    <button onClick={() => setLayout('grid-2')} className={`p-1.5 rounded-md transition-all ${layout === 'grid-2' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`} title="Grid 2x2">
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button onClick={() => setLayout('grid-3')} className={`p-1.5 rounded-md transition-all ${layout === 'grid-3' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`} title="Grid 3x3">
                        <Layout className="w-4 h-4" />
                    </button>
                </div>
            )}
            
            <div className="w-px h-6 bg-white/10 mx-1"></div>

            <button onClick={toggleFullscreen} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
        </div>
      </div>

      {/* Video Grid */}
      <div className={`flex-1 grid gap-4 overflow-y-auto ${getGridClass()}`}>
         {activeFeeds.length === 0 ? (
             <div className="col-span-full h-96 flex flex-col items-center justify-center text-slate-500 glass-card rounded-2xl border-dashed border-2 border-slate-800">
                 <Camera className="w-12 h-12 mb-4 opacity-20" />
                 <p>No active signals detected.</p>
             </div>
         ) : (
             activeFeeds.map(cam => (
                 <VideoCard key={cam.camera_id} camera={cam} isSingle={layout === 'grid-1' || !!selectedCameraId} />
             ))
         )}
      </div>
    </div>
  );
};

// Sub-component for individual feed
const VideoCard = ({ camera, isSingle }) => {
    const [isHovered, setIsHovered] = useState(false);
    // Use timestamp to force refresh if needed, though MJPEG usually handles itself
    const streamUrl = `${BASE_STREAM_URL}/${camera.camera_id}`;

    return (
        <div 
            className="group relative bg-black/60 rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
             {/* Main Feed */}
             <div className="relative flex-1 bg-black flex items-center justify-center">
                 <img 
                    src={streamUrl}
                    alt={`Feed ${camera.camera_id}`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentNode.innerHTML += '<div class="absolute inset-0 flex items-center justify-center text-red-500 text-xs font-mono">SIGNAL LOST</div>';
                    }}
                 />
                 
                 {/* HUD: Top Overlay */}
                 <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                     <div className="flex items-center gap-2">
                         <span className="text-xs font-mono text-white bg-black/50 px-2 py-1 rounded backdrop-blur-md border border-white/10">
                             {camera.camera_id}
                         </span>
                         {camera.location && (
                            <span className="text-[10px] text-slate-300 bg-black/50 px-2 py-1 rounded backdrop-blur-md border border-white/10">
                                {camera.location}
                            </span>
                         )}
                     </div>
                     
                     <div className="flex items-center gap-2">
                         <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/20 border border-red-500/30 rounded backdrop-blur-md">
                             <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                             <span className="text-[10px] font-bold text-red-400 tracking-wider">REC</span>
                         </div>
                     </div>
                 </div>

                 {/* HUD: PTZ Controls (Simulated) */}
                 <div className={`absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/10 transition-all duration-300 ${isHovered ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}`}>
                     <button className="p-1.5 text-slate-400 hover:text-white hover:bg-white/20 rounded-full"><ChevronUp className="w-4 h-4" /></button>
                     <button className="p-1.5 text-slate-400 hover:text-white hover:bg-white/20 rounded-full"><ChevronRight className="w-4 h-4" /></button>
                     <button className="p-1.5 text-slate-400 hover:text-white hover:bg-white/20 rounded-full"><ChevronDown className="w-4 h-4" /></button>
                     <button className="p-1.5 text-slate-400 hover:text-white hover:bg-white/20 rounded-full"><ChevronLeft className="w-4 h-4" /></button>
                 </div>

                 {/* HUD: Bottom Info */}
                 <div className="absolute bottom-4 right-4 opacity-80">
                     <span className="font-mono text-xs text-slate-300 drop-shadow-md">
                         {new Date().toLocaleTimeString()}
                     </span>
                 </div>
             </div>
        </div>
    );
};

export default LiveView;
