import "server-only";
import { cookies } from "next/headers";
import { appConfig } from "@/config/app";
import { ApiError } from "./errors";

export interface ApiClientOptions extends RequestInit {
  responseType?: "json" | "response";
  skipAuth?: boolean;
}

export function getBackendBaseUrl(): string {
  const raw = process.env.AUTH_API_URL?.trim();
  if (!raw) throw new Error("API_URL_NOT_CONFIGURED");
  return raw.replace(/\/+$/, "");
}

export async function apiClient<T = unknown>(
  endpoint: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const baseUrl = getBackendBaseUrl();
  const { responseType = "json", skipAuth = false, headers: initHeaders, ...fetchOptions } = options;

  const headers = new Headers(initHeaders);
  if (!headers.has("Content-Type") && !(fetchOptions.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (!skipAuth) {
    const cookieStore = await cookies();
    const token = cookieStore.get(appConfig.authCookieName)?.value;
    if (!token) throw new Error("UNAUTHORIZED");
    headers.set("Authorization", `Bearer ${token}`);
  }

  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const response = await fetch(`${baseUrl}${normalizedEndpoint}`, {
    ...fetchOptions,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401) {
      throw new Error("UNAUTHORIZED");
    }
    throw new ApiError(
      response.status,
      body,
      response.headers.get("content-type") ?? "application/json; charset=utf-8",
    );
  }

  if (responseType === "response") {
    return response as unknown as T;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const text = await response.text();
    if (!text.trim()) return null as T;
    return JSON.parse(text) as T;
  }

  return (await response.text()) as unknown as T;
}
