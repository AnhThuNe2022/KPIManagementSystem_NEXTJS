export async function request(endpoint: string, options: RequestInit = {}): Promise<unknown> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    credentials: "include",
    headers,
    cache: "no-store",
  });

  if (response.status === 401) throw new Error("UNAUTHORIZED");
  if (response.status === 403) throw new Error("FORBIDDEN");
  if (!response.ok) throw new Error(`API_ERROR_${response.status}`);
  return response.json();
}
