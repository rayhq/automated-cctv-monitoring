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

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.detail || "Login failed");
    }

    // ✅ Save JWT token
    if (data.access_token) {
      localStorage.setItem("token", data.access_token);
    }

    return data;
  },

  async logout() {
    localStorage.removeItem("token");

    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout request failed (ignored):", err);
    }
  },

  async changePassword(currentPassword, newPassword) {
    const res = await fetch(`${API_BASE}/api/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.detail || "Failed to change password");
    }

    return data; // { detail: "Password updated successfully" }
  },

  // 🔹 NEW: Fetch total user count (ADMIN ONLY)
  async fetchUserCount() {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_BASE}/api/auth/user-count`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("User count error:", data);
      throw new Error(data.detail || "Failed to fetch user count");
    }

    return data; // { total_users: number }
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
  async fetchEvents(params = {}) {
    // Determine query params
    const searchParams = new URLSearchParams();
    
    // Default limit if not provided
    if (!params.limit) searchParams.append("limit", "50");

    // Check all keys in params
    Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
            searchParams.append(key, params[key]);
        }
    });

    const url = `${API_BASE}/api/events?${searchParams.toString()}`;

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

    return await res.json();
  },

  // ---------- ADMIN / DANGER ZONE ----------
  async resetEvents() {
    const res = await fetch(`${API_BASE}/api/admin/reset-events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.detail || "Failed to reset events");
    }

    return data;
  },

  async resetEverything() {
    const res = await fetch(`${API_BASE}/api/admin/reset-everything`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.detail || "Full database reset failed");
    }

    return data;
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
