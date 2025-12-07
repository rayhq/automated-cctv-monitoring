import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Camera as CameraIcon } from "lucide-react";
import { api } from "../services/api";

const BASE_STREAM_URL = "http://127.0.0.1:8000/video/stream";

const LiveView = () => {
  const [params] = useSearchParams();
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const selectedCameraId = params.get("camera");

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const data = await api.fetchCameras();
        setCameras(data.filter((c) => c.is_active)); // only active cams
      } catch (err) {
        setError(err.message || "Failed to load cameras");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-slate-400">
        Loading cameras...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-400">
        Failed to load cameras: {error}
      </div>
    );
  }

  if (cameras.length === 0) {
    return (
      <div className="p-6 text-slate-400">
        No active cameras configured. Go to <span className="font-semibold">Camera Management</span> to add one.
      </div>
    );
  }

  // If a specific camera is requested -> single-camera view
  if (selectedCameraId) {
    const cam =
      cameras.find((c) => c.camera_id === selectedCameraId) || cameras[0];
    const STREAM_URL = `${BASE_STREAM_URL}/${cam.camera_id}`;

    return (
      <div className="space-y-6 animate-[fadeIn_0.5s_ease-in] p-6">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <CameraIcon className="w-6 h-6 text-cyan-400" />
            Live View — {cam.camera_id}
          </h1>
          <p className="text-slate-400 mt-1">
            Real-time feed from camera:{" "}
            <span className="font-mono">{cam.camera_id}</span>
            {cam.name ? ` — ${cam.name}` : ""}
          </p>
          {cam.location && (
            <p className="text-slate-500 text-sm mt-0.5">
              Location: {cam.location}
            </p>
          )}
        </div>

        <div className="bg-slate-900/95 rounded-xl border border-slate-800 p-4 shadow-xl">
          <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
            <img
              src={STREAM_URL}
              alt={`Live stream from ${cam.camera_id}`}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>
    );
  }

  // No specific camera -> multi-camera grid
  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-in] p-6">
      <div>
        <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
          <CameraIcon className="w-6 h-6 text-cyan-400" />
          Live CCTV Feeds
        </h1>
        <p className="text-slate-400 mt-1">
          Real-time monitoring of all active campus cameras.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {cameras.map((cam) => (
          <div
            key={cam.camera_id}
            className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-800/60 shadow-2xl shadow-slate-950/40 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {cam.name || cam.camera_id}
                </h2>
                {cam.location && (
                  <p className="text-xs text-slate-400">{cam.location}</p>
                )}
              </div>
              <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/40">
                Live
              </span>
            </div>

            <div className="aspect-video bg-black rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
              <img
                src={`${BASE_STREAM_URL}/${cam.camera_id}`}
                alt={`Live stream - ${cam.name || cam.camera_id}`}
                className="w-full h-full object-contain"
              />
            </div>

            <p className="text-[11px] text-slate-500 mt-2">
              Camera ID:{" "}
              <span className="font-mono">{cam.camera_id}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveView;
