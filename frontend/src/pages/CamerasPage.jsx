import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Plus, X, Activity } from "lucide-react";
import CameraCard from "../components/CameraCard";
import { api, API_BASE } from "../services/api";

const CamerasPage = () => {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    camera_id: "",
    name: "",
    rtsp_url: "",
    location: "",
  });

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
      setIsModalOpen(false);
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
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-in] p-6 text-slate-200">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Camera className="w-6 h-6 text-cyan-400" />
              Camera Management
            </h1>
            <p className="text-slate-400 mt-1 max-w-lg text-sm">
              Configure your surveillance network. Add new RTSP streams or manage existing camera feeds.
            </p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
          >
              <Plus className="w-4 h-4" />
              Add Camera
          </button>
      </div>

      {/* Error Banner */}
      {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              {error}
          </div>
      )}

      {/* Grid Content */}
      {loading ? (
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
               {[1,2,3].map(i => <div key={i} className="h-64 rounded-2xl bg-white/5 animate-pulse" />)}
           </div>
      ) : cameras.length === 0 ? (
           <div className="py-20 flex flex-col items-center justify-center text-center glass-card rounded-2xl border-dashed border-2 border-slate-800">
               <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                    <Camera className="w-8 h-8 text-slate-600" />
               </div>
               <h3 className="text-lg font-medium text-white">No Cameras Configured</h3>
               <p className="text-slate-500 max-w-sm mt-2 mb-6">Start by adding your first camera stream to begin monitoring your premises.</p>
               <button onClick={() => setIsModalOpen(true)} className="text-cyan-400 font-medium hover:underline">Add Camera Now</button>
           </div>
      ) : (
           <motion.div 
             className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
             initial="hidden"
             animate="visible"
             variants={{
               hidden: { opacity: 0 },
               visible: {
                 opacity: 1,
                 transition: {
                   staggerChildren: 0.1
                 }
               }
             }}
           >
               {cameras.map(cam => (
                   <CameraCard 
                       key={cam.camera_id} 
                       cam={cam} 
                       onToggle={handleToggle} 
                       onDelete={handleDelete} 
                   />
               ))}
           </motion.div>
       )}

      {/* Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
              
              <div className="relative w-full max-w-md bg-[#0B0F14] border border-white/10 rounded-2xl shadow-2xl p-6 animate-slide-up">
                  <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-white">Add New Camera</h2>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                  </div>

                  <form onSubmit={handleCreate} className="space-y-4">
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">Camera Identifier</label>
                          <input 
                            type="text" 
                            placeholder="e.g. cam-05" 
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-cyan-500/50 outline-none transition-colors placeholder:text-slate-600"
                            value={form.camera_id}
                            onChange={e => setForm({...form, camera_id: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">Friendly Name</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Server Room Main" 
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-cyan-500/50 outline-none transition-colors placeholder:text-slate-600"
                            value={form.name}
                            onChange={e => setForm({...form, name: e.target.value})}
                          />
                      </div>
                       <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">RTSP / Video Source</label>
                          <input 
                            type="text" 
                            placeholder="rtsp://admin:password@192.168.1.10..." 
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-cyan-500/50 outline-none transition-colors placeholder:text-slate-600 font-mono"
                            value={form.rtsp_url}
                            onChange={e => setForm({...form, rtsp_url: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">Location (Optional)</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Building A, Floor 2" 
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-cyan-500/50 outline-none transition-colors placeholder:text-slate-600"
                            value={form.location}
                            onChange={e => setForm({...form, location: e.target.value})}
                          />
                      </div>

                      <div className="pt-4 flex gap-3">
                          <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 py-2.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 text-sm font-medium transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                            type="submit" 
                            disabled={creating}
                            className="flex-1 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors shadow-lg shadow-cyan-900/20 disabled:opacity-50"
                          >
                              {creating ? "Connecting..." : "Add Camera"}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default CamerasPage;
