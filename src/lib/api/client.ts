import "server-only";

import { cookies } from "next/headers";
import { appConfig } from "@/config/app";

const API_URL = process.env.AUTH_API_URL?.replace(/\/$/, "");

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!API_URL) {
    throw new Error("API_URL_NOT_CONFIGURED");
  }

  // Lấy token từ HttpOnly Cookie
  const cookieStore = await cookies();
  const token = cookieStore.get(appConfig.authCookieName)?.value;

  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    cache: "no-store",
  });

if (!response.ok) {
  const errorText = await response.text();

  console.error("API ERROR:", {
    url: `${API_URL}${endpoint}`,
    status: response.status,
    statusText: response.statusText,
    response: errorText,
  });

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  throw new Error(`API_ERROR_${response.status}: ${errorText}`);
}

const contentType =
  response.headers.get("content-type") ?? "";

if (contentType.includes("application/json")) {
  return response.json() as Promise<T>;
}

return response.text() as Promise<T>;
}