import type { NextResponse } from "next/server";
import { appConfig } from "@/config/app";

export interface JwtPayload {
  sub?: string;
  userId?: string;
  roles?: string[];
  exp?: number;
  [key: string]: unknown;
}

export function decodeJwtPayload(token: string | null | undefined): JwtPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json =
      typeof Buffer !== "undefined"
        ? Buffer.from(padded, "base64").toString("utf8")
        : atob(padded);
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as JwtPayload) : null;
  } catch {
    return null;
  }
}

export function isJwtUnexpired(token: string | null | undefined, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  if (typeof payload.exp !== "number") return false;
  return payload.exp > nowSeconds;
}

export function setAuthCookies(
  response: NextResponse,
  params: { token: string; userId: string; roles: string[]; userName: string },
): void {
  const secure = process.env.NODE_ENV === "production";
  const base = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: appConfig.cookieMaxAgeSeconds,
  };
  response.cookies.set(appConfig.authCookieName, params.token, base);
  response.cookies.set(appConfig.userIdCookieName, params.userId, base);
  response.cookies.set(appConfig.rolesCookieName, JSON.stringify(params.roles ?? []), base);
  response.cookies.set(appConfig.userNameCookieName, params.userName, base);
}

export function clearAllAuthCookies(response: NextResponse): void {
  const secure = process.env.NODE_ENV === "production";
  const expired = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
  response.cookies.set(appConfig.authCookieName, "", expired);
  response.cookies.set(appConfig.userIdCookieName, "", expired);
  response.cookies.set(appConfig.rolesCookieName, "", expired);
  response.cookies.set(appConfig.userNameCookieName, "", expired);
}
