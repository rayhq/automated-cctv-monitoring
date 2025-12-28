// src/pages/LiveView.jsx
import React from "react";
import { Camera } from "lucide-react";
import { API_BASE } from "./services/api";

const LiveView = () => {
  const STREAM_URL = `${API_BASE}/video/stream`;

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-in]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Camera className="w-6 h-6 text-cyan-400" />
            Live CCTV Feed
          </h1>
          <p className="text-slate-400 mt-1">
            Real-time stream from the monitored camera source.
          </p>
        </div>
      </div>

      {/* Video Card */}
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-800/60 shadow-2xl shadow-slate-950/40 p-4 md:p-6">
        <div className="aspect-video w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
          {/* Basic MJPEG stream */}
          <img
            src={STREAM_URL}
            alt="Live CCTV Stream"
            className="w-full h-full object-contain"
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Streaming over MJPEG from FastAPI. For production, this can be
          upgraded to RTSP/WebRTC/HLS if needed.
        </p>
      </div>
    </div>
  );
};

export default LiveView;
