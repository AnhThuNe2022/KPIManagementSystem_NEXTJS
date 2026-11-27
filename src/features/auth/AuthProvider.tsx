"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { AuthContextValue, AuthUser } from "./types";
import { clearWorkspaceCache } from "@/features/workspace/workspaces";

const AuthContext =
  createContext<AuthContextValue | null>(
    null
  );

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);
  const refreshVersion = useRef(0);

  const refresh = async () => {
    const version = ++refreshVersion.current;

    try {

      setIsLoading(true);

      const response =
        await fetch(
          "/api/auth/me",
          {
            credentials: "include",
          }
        );

      if (version !== refreshVersion.current) return;
      if (!response.ok) {
        clearWorkspaceCache();
        setUser(null);
        return;
      }

      const data =
        await response.json();

      if (version === refreshVersion.current) setUser(data.user);

    } catch {

      if (version === refreshVersion.current) setUser(null);

    } finally {

      if (version === refreshVersion.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const logout = async () => {

    const response = await fetch(
      "/api/auth/logout",
      {
        method: "POST",
        credentials: "include",
      }
    );

    if (!response.ok) throw new Error("Logout failed");

    clearWorkspaceCache();
    refreshVersion.current++;
    setUser(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        refresh,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {

  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}
