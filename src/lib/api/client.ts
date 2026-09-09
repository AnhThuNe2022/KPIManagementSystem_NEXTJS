import "server-only";

import { cookies } from "next/headers";

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
  const token = cookieStore.get("access_token")?.value;

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
    if (response.status === 401) {
      throw new Error("UNAUTHORIZED");
    }

    throw new Error(`API_ERROR_${response.status}`);
  }

  return response.json() as Promise<T>;
}