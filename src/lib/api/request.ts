export async function request<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch("/api" + endpoint, {
    ...options, headers, credentials: "include", cache: "no-store",
  });
  if (response.status === 401) throw new Error("UNAUTHORIZED");
  if (response.status === 403) throw new Error("FORBIDDEN");
  if (!response.ok) throw new Error("API_ERROR_" + response.status);

  const data: unknown = response.status === 204 ? undefined : await response.json();
  if (data && typeof data === "object" && "success" in data && data.success === false) {
    throw new Error("API_OPERATION_FAILED");
  }
  return data as T;
}
