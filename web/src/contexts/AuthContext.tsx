import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiFetch } from "../lib/api";
const API_BASE = import.meta.env.VITE_API_URL;
import { User } from "../types";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
  /**
   * Check if the current user has a specific permission.
   * Usage: can('project:create'), can('user:read')
   * Never check role names — always use permission codes.
   */
  can: (permission: string) => boolean;
  /**
   * Check if the current user has ALL of the listed permissions.
   */
  canAll: (...permissions: string[]) => boolean;
  /**
   * Check if the current user has ANY of the listed permissions.
   */
  canAny: (...permissions: string[]) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Écoute l'événement émis par apiFetch quand le token est expiré et non-renouvelable.
  // On met user à null → ProtectedRoute redirige vers /login via React Router (pas de reload).
  useEffect(() => {
    const onSessionExpired = () => setUser(null);
    window.addEventListener('auth:session-expired', onSessionExpired);
    return () => window.removeEventListener('auth:session-expired', onSessionExpired);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      apiFetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
        else localStorage.removeItem("token");
      })
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await apiFetch(`${API_BASE}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        console.error("Logout API failed", e);
      }
    }
    localStorage.removeItem("token");
    setUser(null);
  };

  const can = useCallback(
    (permission: string): boolean => user?.permissions?.includes(permission) ?? false,
    [user]
  );

  const canAll = useCallback(
    (...permissions: string[]): boolean =>
      permissions.every(p => user?.permissions?.includes(p) ?? false),
    [user]
  );

  const canAny = useCallback(
    (...permissions: string[]): boolean =>
      permissions.some(p => user?.permissions?.includes(p) ?? false),
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can, canAll, canAny }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/**
 * Standalone hook for permission checks without needing the full auth context.
 * Usage: const { can } = usePermissions();
 */
export const usePermissions = () => {
  const { can, canAll, canAny } = useAuth();
  return { can, canAll, canAny };
};
