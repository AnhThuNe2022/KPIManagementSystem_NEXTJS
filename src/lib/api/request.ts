export async function request<T = unknown>(endpoint: string, options: RequestInit = {}, responseType?: "response"): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch("/api" + endpoint, {
    ...options, headers, credentials: "include", cache: "no-store",
  });
  if (response.status === 401) throw new Error("UNAUTHORIZED");
  if (response.status === 403) throw new Error("FORBIDDEN");
  if (response.ok && responseType === "response") return response as T;
  const data = response.status === 204 ? undefined
    : response.headers.get("content-type")?.includes("json") ? await response.json() : await response.text();
  if (!response.ok || data?.success === false) {
    const fallback = response.ok ? "API_OPERATION_FAILED" : "API_ERROR_" + response.status;
    throw new Error(typeof data === "string" ? data || fallback : data?.message || fallback);
  }
  return data as T;
}

export async function requestBlob(
  endpoint: string,
  options: RequestInit = {},
): Promise<{ blob: Blob; filename?: string }> {
  const response = await request<Response>(endpoint, options, "response");
  const disposition = response.headers.get("content-disposition");
  const encodedName = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  let filename = disposition?.match(/filename="?([^";]+)"?/i)?.[1]?.trim() || undefined;
  if (encodedName) {
    try { filename = decodeURIComponent(encodedName.trim()); } catch { filename = encodedName.trim(); }
  }
  return {
    blob: await response.blob(),
    filename,
  };
}

export async function downloadFile(endpoint: string, options: RequestInit, fallbackFilename: string) {
  const { blob, filename } = await requestBlob(endpoint, options);
  options.signal?.throwIfAborted();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || fallbackFilename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
