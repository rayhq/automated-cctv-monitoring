// src/context/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Restore from token on page refresh
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setInitializing(false);
      return;
    }

    // TODO: if you add /me endpoint, call it here.
    setUser({
      username: "admin",
      full_name: "Admin",
      is_admin: true,
    });

    setInitializing(false);
  }, []);

  const login = async (username, password) => {
    const data = await api.login(username, password);

    const userFromApi = data.user ?? {
      username,
      full_name: username,
      is_admin: true,
    };

    setUser(userFromApi);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.error("Logout error (ignored):", e);
    } finally {
      // ✅ THIS is what really logs you out
      localStorage.removeItem("token");
      setUser(null);
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, initializing, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
