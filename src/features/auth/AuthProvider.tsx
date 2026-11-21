"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { AuthUser } from "./types";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  refresh: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SKIP_INITIAL_FETCH_PATHS = new Set(["/login", "/reset-password"]);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(() => !SKIP_INITIAL_FETCH_PATHS.has(pathname ?? ""));
  const versionRef = useRef(0);

  const refresh = useCallback(async (): Promise<AuthUser | null> => {
    const version = ++versionRef.current;
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });
      if (version !== versionRef.current) return null;
      if (!response.ok) {
        setUser(null);
        return null;
      }
      const data = (await response.json()) as { user?: AuthUser | null };
      const nextUser = data?.user ?? null;
      setUser(nextUser);
      return nextUser;
    } catch {
      if (version === versionRef.current) {
        setUser(null);
      }
      return null;
    } finally {
      if (version === versionRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    versionRef.current += 1;
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (SKIP_INITIAL_FETCH_PATHS.has(pathname ?? "")) {
      setIsLoading(false);
      return;
    }
    void refresh();
  }, [pathname, refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, refresh, logout }),
    [user, isLoading, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
