export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code ?? `HTTP_${status}`;
    this.details = details;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";
}

export function getErrorMessage(error: unknown, fallback = "Đã xảy ra lỗi. Vui lòng thử lại."): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 401 || error.code === "UNAUTHORIZED") {
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    }
    if (error.status === 403 || error.code === "FORBIDDEN") {
      return error.message && error.message !== "FORBIDDEN"
        ? error.message
        : "Bạn không có quyền thực hiện thao tác này.";
    }
    if (error.message && !error.message.startsWith("API_ERROR_")) {
      return error.message;
    }
    return fallback;
  }
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    }
    if (error.message === "FORBIDDEN") {
      return "Bạn không có quyền thực hiện thao tác này.";
    }
    if (error.message && !error.message.startsWith("API_ERROR_") && !error.message.startsWith("INVALID_")) {
      return error.message;
    }
  }
  return fallback;
}

function extractMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return typeof payload === "string" && payload.trim() && !payload.trim().startsWith("<")
      ? payload.trim()
      : null;
  }
  const record = payload as Record<string, unknown>;
  for (const key of ["message", "Message", "error", "Error", "title", "detail"]) {
    const val = record[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  if (record.errors && typeof record.errors === "object") {
    const first = Object.values(record.errors as Record<string, unknown>)
      .flatMap((v) => (Array.isArray(v) ? v : [v]))
      .find((v) => typeof v === "string" && v.trim());
    if (typeof first === "string") return first.trim();
  }
  return null;
}

export async function request<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = endpoint.startsWith("/api") ? endpoint : `/api${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  let data: unknown = null;
  if (contentType.includes("application/json")) {
    const raw = await response.text();
    if (raw.trim()) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = raw;
      }
    }
  } else {
    const raw = await response.text();
    data = raw || null;
  }

  if (response.status === 401) {
    throw new ApiRequestError(
      extractMessage(data) ?? "UNAUTHORIZED",
      401,
      "UNAUTHORIZED",
      data,
    );
  }
  if (response.status === 403) {
    throw new ApiRequestError(
      extractMessage(data) ?? "FORBIDDEN",
      403,
      "FORBIDDEN",
      data,
    );
  }

  if (!response.ok) {
    throw new ApiRequestError(
      extractMessage(data) ?? `API_ERROR_${response.status}`,
      response.status,
      `API_ERROR_${response.status}`,
      data,
    );
  }

  if (
    data &&
    typeof data === "object" &&
    "success" in data &&
    (data as { success?: unknown }).success === false
  ) {
    throw new ApiRequestError(
      extractMessage(data) ?? "API_OPERATION_FAILED",
      response.status,
      "API_OPERATION_FAILED",
      data,
    );
  }

  return data as T;
}

function parseFilename(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) return fallback;
  const utf8Match = /filename\*=UTF-8''([^;\s]+)/i.exec(contentDisposition);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const asciiMatch = /filename="?([^";\n]+)"?/i.exec(contentDisposition);
  if (asciiMatch?.[1]) return asciiMatch[1].trim();
  return fallback;
}

export async function requestBlob(
  endpoint: string,
  options: RequestInit = {},
): Promise<{ blob: Blob; filename: string | null }> {
  const url = endpoint.startsWith("/api") ? endpoint : `/api${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers,
  });

  if (!response.ok) {
    let payload: unknown = null;
    try {
      const text = await response.text();
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }
    throw new ApiRequestError(
      extractMessage(payload) ?? `API_ERROR_${response.status}`,
      response.status,
      response.status === 401 ? "UNAUTHORIZED" : response.status === 403 ? "FORBIDDEN" : `API_ERROR_${response.status}`,
      payload,
    );
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition");
  return {
    blob,
    filename: disposition ? parseFilename(disposition, "") || null : null,
  };
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

export async function downloadFile(
  endpoint: string,
  fallbackFilename: string,
  options: RequestInit = {},
): Promise<string> {
  const { blob, filename } = await requestBlob(endpoint, options);
  const finalName = filename || fallbackFilename;
  triggerBlobDownload(blob, finalName);
  return finalName;
}
