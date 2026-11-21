import "server-only";
import { NextResponse } from "next/server";
import { apiClient, type ApiClientOptions } from "./client";
import { ApiError, getApiErrorStatus } from "./errors";

export function isSameOriginMutation(request: Request, effectiveMethod?: string): boolean {
  const method = (effectiveMethod ?? request.method).toUpperCase();
  if (method === "GET" || method === "HEAD") return true;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function proxyApiRequest(
  request: Request,
  upstreamEndpoint: string,
  options: ApiClientOptions = {},
): Promise<NextResponse> {
  const effectiveMethod = (options.method ?? request.method).toUpperCase();
  if (!isSameOriginMutation(request, effectiveMethod)) {
    return NextResponse.json({ message: "Invalid origin" }, { status: 403 });
  }

  try {
    const result = await apiClient<unknown>(upstreamEndpoint, {
      ...options,
      method: effectiveMethod,
      signal: options.signal ?? request.signal,
    });

    if (options.responseType === "response") {
      const upstream = result as Response;
      const headers = new Headers();
      const ct = upstream.headers.get("content-type");
      const cd = upstream.headers.get("content-disposition");
      if (ct) headers.set("Content-Type", ct);
      if (cd) headers.set("Content-Disposition", cd);
      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers,
      });
    }

    if (result === undefined) {
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json(result ?? null, { status: 200 });
  } catch (error) {
    if (error instanceof ApiError) {
      return new NextResponse(error.body || JSON.stringify({ message: "Backend API request failed" }), {
        status: error.status,
        headers: {
          "Content-Type": error.contentType.includes("json")
            ? "application/json; charset=utf-8"
            : "text/plain; charset=utf-8",
        },
      });
    }

    const status = getApiErrorStatus(error);
    const message =
      status === 401
        ? "Unauthorized"
        : status === 502
          ? "Backend API URL is not configured"
          : "Backend API request failed";
    return NextResponse.json({ message }, { status });
  }
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const raw = await request.text();
  if (!raw.trim()) return undefined;
  return JSON.parse(raw);
}
