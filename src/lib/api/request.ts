export async function request<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch("/api" + endpoint, {
    ...options, headers, credentials: "include", cache: "no-store",
  });
  if (response.status === 401) throw new Error("UNAUTHORIZED");
  if (response.status === 403) throw new Error("FORBIDDEN");
  const data = response.status === 204 ? undefined
    : response.headers.get("content-type")?.includes("json") ? await response.json() : await response.text();
  if (!response.ok || data?.success === false) {
    const fallback = response.ok ? "API_OPERATION_FAILED" : "API_ERROR_" + response.status;
    throw new Error(typeof data === "string" ? data || fallback : data?.message || fallback);
  }
  return data as T;
}
