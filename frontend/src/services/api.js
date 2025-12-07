// src/services/api.js
const API_BASE = "http://127.0.0.1:8000";

// ** NEW FUNCTION ADDED HERE **
export const getImageUrl = (path) => {
  if (!path) return "";
  // Ensures the path is correctly constructed, avoiding double slashes (e.g., //api/...)
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
    } // Save token for future requests

    localStorage.setItem("token", data.access_token);
    return data;
  },

  async logout() {
    // Optional: Clear token on logout
    localStorage.removeItem("token"); // If you use cookies, keep this line:

    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  }, // ---------- CAMERAS ----------

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
      method: "PATCH", // Ensure your backend uses PATCH or PUT
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) throw new Error("Toggle failed");
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
    return true; // Return true on success
  }, // ---------- EVENTS (Fixes Red Banner) ----------

  async fetchEvents() {
    try {
      const res = await fetch(`${API_BASE}/api/events`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch events");
      return await res.json();
    } catch (error) {
      console.error("Error fetching events:", error);
      throw error;
    }
  }, // ---------- SYSTEM HEALTH (Fixes Offline Badge) ----------

  async checkSystemHealth() {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (res.ok) {
        return await res.json(); // Returns { status: "ok" }
      }
      return { status: "error" };
    } catch (error) {
      console.error("Health check failed:", error);
      return { status: "error" };
    }
  },
};
