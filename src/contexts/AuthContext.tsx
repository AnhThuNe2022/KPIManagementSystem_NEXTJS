"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

export interface AuthUser {
  id: string;
  roles: string[];
  username?: string;
  email?: string;
  fullName?: string;
}

interface AuthContextValue {
  user: AuthUser | null;

  isAuthenticated: boolean;

  isLoading: boolean;

  refresh: () => Promise<void>;

  logout: () => Promise<void>;
}

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

  const refresh = async () => {

    try {

      setIsLoading(true);

      const response =
        await fetch(
          "/api/auth/me",
          {
            credentials: "include",
          }
        );

      if (!response.ok) {
        setUser(null);
        return;
      }

      const data =
        await response.json();

      setUser(data.user);

    } catch {

      setUser(null);

    } finally {

      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const logout = async () => {

    await fetch(
      "/api/auth/logout",
      {
        method: "POST",
        credentials: "include",
      }
    );

    setUser(null);
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