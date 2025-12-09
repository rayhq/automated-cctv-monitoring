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

  // ✅ Restore session from token on page refresh
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setInitializing(false);
      return;
    }

    // ✅ Since backend doesn't have /me yet,
    // we reconstruct a basic admin user locally
    setUser({
      username: "admin",
      full_name: "Admin",
      is_admin: true,
    });

    setInitializing(false);
  }, []);

  // ✅ FIXED LOGIN (no data.user usage anymore)
  const login = async (username, password) => {
    // This throws if credentials are invalid
    await api.login(username, password);

    // Create a local user object after successful login
    setUser({
      username: username,
      full_name: username,
      is_admin: true,
    });
  };

  // ✅ LOGOUT (token + state cleared)
  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.error("Logout error (ignored):", e);
    } finally {
      localStorage.removeItem("token");
      setUser(null);
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        initializing,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
