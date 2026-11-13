import { NextResponse } from "next/server";
import { apiClient } from "./client";
import { ApiError, getApiErrorStatus } from "./errors";

export async function proxyApiRequest(request: Request, endpoint: string, options: RequestInit = {}) {
  const method = options.method ?? request.method;
  const origin = request.headers.get("origin");
  if (method !== "GET" && method !== "HEAD" && origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ message: "Invalid origin" }, { status: 403 });
  }

  try {
    const body = options.body ?? (method === "GET" || method === "HEAD" ? undefined : await request.text());
    const result = await apiClient(endpoint, {
      ...options, method, body, signal: options.signal ?? request.signal,
    });
    return NextResponse.json(result ?? null);
  } catch (error) {
    if (error instanceof ApiError) {
      return new NextResponse(error.body, {
        status: error.status,
        headers: { "Content-Type": error.contentType ?? "text/plain; charset=utf-8" },
      });
    }
    return NextResponse.json(
      { message: error instanceof Error && error.message === "UNAUTHORIZED" ? "Unauthorized" : "Backend API request failed" },
      { status: getApiErrorStatus(error) },
    );
  }
}
