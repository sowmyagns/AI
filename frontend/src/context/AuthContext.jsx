import { createContext, useCallback, useEffect, useMemo, useState } from "react";

import { getCurrentUser, logout as logoutApi } from "../api/authApi";
import { setUnauthorizedHandler } from "../api/axiosConfig";

export const AuthContext = createContext(null);

function normalizeUser(raw) {
  if (!raw || typeof raw !== "object") return null;
  const fullName = raw.full_name ?? raw.name ?? "User";
  return {
    ...raw,
    full_name: fullName,
    name: fullName,
    role: raw.role ?? raw.role_name ?? "Operator",
    role_name: raw.role_name ?? raw.role ?? "Operator",
    roles: Array.isArray(raw.roles) ? raw.roles : [],
    permissions: Array.isArray(raw.permissions) ? raw.permissions : [],
  };
}

function readStoredUser() {
  try {
    const stored = localStorage.getItem("smrt-user");
    if (stored) return normalizeUser(JSON.parse(stored));
  } catch {}
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let token = null;
    try {
      token = localStorage.getItem("smrt-token");
    } catch {
      return undefined;
    }
    if (!token) return undefined;

    getCurrentUser()
      .then((data) => {
        if (cancelled || !data) return;
        const u = normalizeUser(data);
        setUser(u);
        try {
          localStorage.setItem("smrt-user", JSON.stringify(u));
        } catch {}
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 401) {
          try {
            localStorage.removeItem("smrt-token");
            localStorage.removeItem("smrt-refresh-token");
            localStorage.removeItem("smrt-user");
          } catch {}
          setUser(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback((authData) => {
    let u;
    if (typeof authData === "object" && authData !== null) {
      const token = authData.access_token ?? authData.token;
      const refreshToken = authData.refresh_token;
      const userPayload = authData.user ?? authData;
      const rest = { ...userPayload };
      delete rest.access_token;
      delete rest.refresh_token;
      u = normalizeUser(rest);
      if (token) {
        try {
          localStorage.setItem("smrt-token", token);
        } catch {}
      }
      if (refreshToken) {
        try {
          localStorage.setItem("smrt-refresh-token", refreshToken);
        } catch {}
      }
    } else {
      u = { name: String(authData), role: "Operator" };
    }
    setUser(u);
    try {
      localStorage.setItem("smrt-user", JSON.stringify(u));
      if (u?.tenant_name) {
        localStorage.setItem("smrt-company-name", u.tenant_name);
      }
    } catch {}
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem("smrt-refresh-token");
      if (refreshToken) {
        await logoutApi(refreshToken).catch(() => {});
      }
    } catch {}
    setUser(null);
    try {
      localStorage.removeItem("smrt-user");
      localStorage.removeItem("smrt-token");
      localStorage.removeItem("smrt-refresh-token");
    } catch {}
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("smrt-token");
      if (!token) return;
      const data = await getCurrentUser();
      const u = normalizeUser(data);
      setUser(u);
      localStorage.setItem("smrt-user", JSON.stringify(u));
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      logout,
      refreshUser,
    }),
    [user, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
