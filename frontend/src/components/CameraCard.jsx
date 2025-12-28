import React, { useState } from "react";
import { motion } from "framer-motion";
import { Activity, Signal, WifiOff, MapPin, Trash2 } from "lucide-react";
import { API_BASE } from "../services/api";

const CameraCard = ({ cam, onToggle, onDelete }) => {
    const [imageError, setImageError] = useState(false);

    // Reset error state if camera becomes active or ID changes
    // This allows the image to try loading again if it was previously broken
    // or if the camera status changes.
    React.useEffect(() => {
        if (cam.is_active) {
            setImageError(false);
        }
    }, [cam.is_active, cam.camera_id]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`group relative rounded-2xl overflow-hidden backdrop-blur-md transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(34,211,238,0.15)] hover:-translate-y-1 ${
                cam.is_active
                    ? 'bg-gradient-to-br from-[#0f172a]/80 to-[#0f172a]/40 border border-cyan-500/20'
                    : 'bg-black/40 border border-white/5 grayscale'
            }`}
        >
            {/* Neon active border glow */}
            <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${cam.is_active ? 'opacity-0 group-hover:opacity-100 shadow-[inset_0_0_20px_rgba(34,211,238,0.1)] border border-cyan-400/30 rounded-2xl' : ''}`} />

            {/* Preview Header */}
            <div className="relative h-48 bg-black group-hover:opacity-90 transition-opacity overflow-hidden">
                {/* Live Preview / Offline State */}
                {/* 
                  Only show the image if the camera is active AND we haven't encountered an error yet.
                  If onError triggers, we hide this img (via state) and show the fallback.
                */}
                {cam.is_active && !imageError && (
                    <img
                        key={`${cam.camera_id}-${cam.is_active}`} // Force re-mount on status change
                        src={`${API_BASE}/api/video/stream/${cam.camera_id}`}
                        className="relative z-10 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105"
                        onError={() => setImageError(true)}
                        alt={`Stream for ${cam.name}`}
                    />
                )}

                {/* Fallback Overlay (Shown when img hidden or loading or offline) */}
                {/* Logic: Show this if camera is NOT active, OR if it IS active but we had an image error. */}
                {(!cam.is_active || imageError) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 border-b border-white/5 z-0">
                        <div className={`w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-2 ${cam.is_active ? 'animate-pulse' : ''}`}>
                            <Signal className="w-6 h-6 text-slate-600" />
                        </div>
                        <span className="text-xs font-mono text-slate-500">
                            {cam.is_active ? "SIGNAL LOST" : "FEED DISABLED"}
                        </span>
                    </div>
                )}

                <div className="absolute top-3 right-3 flex gap-2 z-20">
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-xl shadow-lg ${cam.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {cam.is_active ? (
                            <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_currentColor]" />
                                Active
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-3 h-3" />
                                Offline
                            </>
                        )}
                    </span>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20">
                    <h3 className="text-white font-bold text-shadow-md tracking-tight flex items-center gap-2">
                        {cam.name}
                        {cam.is_active && <Activity className="w-3 h-3 text-cyan-400" />}
                    </h3>
                </div>
            </div>

            {/* Action Footer */}
            <div className="p-4 bg-white/[0.02] border-t border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {cam.location || "Unspecified Location"}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono bg-white/5 px-2 py-0.5 rounded">
                        <Signal className="w-3 h-3" />
                        {cam.camera_id}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => onToggle(cam.camera_id)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all duration-300 ${cam.is_active ? 'border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40' : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/40'}`}
                    >
                        {cam.is_active ? 'Disable Feed' : 'Enable Feed'}
                    </button>
                    <button
                        onClick={() => onDelete(cam.camera_id)}
                        className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-colors"
                        title="Delete Camera"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default CameraCard;
