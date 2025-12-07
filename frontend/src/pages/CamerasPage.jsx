// src/pages/CamerasPage.jsx
import React, { useEffect, useState } from "react";
import { Camera, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { api } from "../services/api";

const CamerasPage = () => {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    camera_id: "",
    name: "",
    rtsp_url: "",
    location: "",
  });

  const [creating, setCreating] = useState(false);

  const loadCameras = async () => {
    try {
      setError(null);
      const data = await api.fetchCameras();
      setCameras(data);
    } catch (err) {
      setError(err.message || "Failed to load cameras");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCameras();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.camera_id || !form.name || !form.rtsp_url) return;

    try {
      setCreating(true);
      await api.createCamera({
        ...form,
        is_active: true,
      });
      setForm({ camera_id: "", name: "", rtsp_url: "", location: "" });
      await loadCameras();
    } catch (err) {
      alert(err.message || "Failed to create camera");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (cameraId) => {
    try {
      await api.toggleCamera(cameraId);
      await loadCameras();
    } catch (err) {
      alert(err.message || "Failed to toggle camera");
    }
  };

  const handleDelete = async (cameraId) => {
    if (!window.confirm("Delete this camera?")) return;
    try {
      await api.deleteCamera(cameraId);
      await loadCameras();
    } catch (err) {
      alert(err.message || "Failed to delete camera");
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-in] p-6">
      <div>
        <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
          <Camera className="w-6 h-6 text-cyan-400" />
          Camera Management
        </h1>
        <p className="text-slate-400 mt-1">
          Add, configure, and manage all campus CCTV cameras.
        </p>
      </div>

      {/* Add Camera Form */}
      <div className="bg-slate-900/95 rounded-xl border border-slate-800 p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-cyan-400" />
          Add New Camera
        </h2>
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 md:grid-cols-4 gap-3"
        >
          <input
            type="text"
            placeholder="Camera ID (e.g. cam1)"
            value={form.camera_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, camera_id: e.target.value }))
            }
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
          <input
            type="text"
            placeholder="Name (e.g. Lab Camera 1)"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
          <input
            type="text"
            placeholder="RTSP / Video URL"
            value={form.rtsp_url}
            onChange={(e) =>
              setForm((f) => ({ ...f, rtsp_url: e.target.value }))
            }
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
          <input
            type="text"
            placeholder="Location (optional)"
            value={form.location}
            onChange={(e) =>
              setForm((f) => ({ ...f, location: e.target.value }))
            }
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />

          <button
            type="submit"
            disabled={creating}
            className="md:col-span-4 mt-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-sm font-medium text-white transition disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            {creating ? "Adding..." : "Add Camera"}
          </button>
        </form>
      </div>

      {/* Cameras Table */}
      <div className="bg-slate-900/95 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Registered Cameras
          </h2>
          {loading && (
            <span className="text-xs text-slate-400">Loading...</span>
          )}
        </div>
        {error ? (
          <div className="p-5 text-sm text-red-400">{error}</div>
        ) : cameras.length === 0 ? (
          <div className="p-5 text-sm text-slate-400">
            No cameras configured yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/80 text-slate-400">
                <tr>
                  <th className="px-5 py-3 text-left">Camera ID</th>
                  <th className="px-5 py-3 text-left">Name</th>
                  <th className="px-5 py-3 text-left">Location</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {cameras.map((cam) => (
                  <tr key={cam.id} className="hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-mono text-slate-200">
                      {cam.camera_id}
                    </td>
                    <td className="px-5 py-3 text-slate-200">{cam.name}</td>
                    <td className="px-5 py-3 text-slate-400">
                      {cam.location || "-"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] ${
                          cam.is_active
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/40"
                            : "bg-slate-700/60 text-slate-300 border border-slate-600"
                        }`}
                      >
                        {cam.is_active ? (
                          <ToggleRight className="w-3 h-3" />
                        ) : (
                          <ToggleLeft className="w-3 h-3" />
                        )}
                        {cam.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggle(cam.camera_id)}
                          className="text-xs text-cyan-400 hover:text-cyan-300"
                        >
                          Toggle
                        </button>
                        <button
                          onClick={() => handleDelete(cam.camera_id)}
                          className="text-xs text-red-400 hover:text-red-300 inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
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
  );
};

export default CamerasPage;
