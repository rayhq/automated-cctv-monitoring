// src/services/api.js
const API_BASE = "http://127.0.0.1:8000";

// Helper for image URLs
export const getImageUrl = (path) => {
  if (!path) return "";
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
};

export const api = {
  // ---------- AUTH ----------
  async login(username, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || "Login failed");
    }

    // Save token for future requests
    localStorage.setItem("token", data.access_token);
    return data;
  },

  async logout() {
    // Clear token on logout
    localStorage.removeItem("token");

    // Hit backend logout (optional, but fine to keep)
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  },

  // ---------- CAMERAS ----------
  async fetchCameras() {
    const res = await fetch(`${API_BASE}/api/cameras/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    if (!res.ok) throw new Error("Failed to load cameras");
    return res.json();
  },

  async createCamera(payload) {
    const res = await fetch(`${API_BASE}/api/cameras/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Create failed");
    }
    return res.json();
  },

  async toggleCamera(cameraId) {
    const res = await fetch(`${API_BASE}/api/cameras/${cameraId}/toggle`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Toggle camera error:", res.status, text);
      throw new Error(text || "Toggle failed");
    }
    return res.json();
  },

  async deleteCamera(cameraId) {
    const res = await fetch(`${API_BASE}/api/cameras/${cameraId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    if (!res.ok) throw new Error("Delete failed");
    return true;
  },

  // ---------- EVENTS ----------
  // accept optional limit (defaults to 50)
  async fetchEvents(limit = 50) {
    const url = `${API_BASE}/api/events?limit=${encodeURIComponent(limit)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Error fetching events:", res.status, text);
      throw new Error("Failed to fetch events");
    }

    return await res.json();
  },

  // ✅ NEW: aggregated stats for the dashboard header
  async fetchEventStats() {
    const res = await fetch(`${API_BASE}/api/events/stats`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Error fetching event stats:", res.status, text);
      throw new Error("Failed to fetch event stats");
    }

    // expected shape:
    // { total_events, intrusion_events, last_event_time }
    return await res.json();
  },

  // ---------- SYSTEM HEALTH ----------
  async checkSystemHealth() {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (res.ok) {
        return await res.json(); // { status: "ok" }
      }
      return { status: "error" };
    } catch (error) {
      console.error("Health check failed:", error);
      return { status: "error" };
    }
  },
};
