import { useCallback, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import type { AuthUser } from "./authTypes";
import { getMe } from "../api";

const TOKEN_KEY = "crm_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate user from /api/auth/me on mount or token change
  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getMe(token)
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    // Fire logout log — best-effort, don't await
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) {
      const base = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
      fetch(`${base}/api/auth/me`, {
        headers: { Authorization: `Bearer ${t}`, "x-logout": "true" },
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
