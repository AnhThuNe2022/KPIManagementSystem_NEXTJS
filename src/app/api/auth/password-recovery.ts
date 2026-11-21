import "server-only";
import { NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/server/api/client";
import { isSameOriginMutation } from "@/server/api/proxy";

export async function forwardPasswordRecovery(
  request: Request,
  upstreamPath: string,
): Promise<NextResponse> {
  if (!isSameOriginMutation(request, "POST")) {
    return NextResponse.json({ message: "Invalid origin" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Dữ liệu yêu cầu không hợp lệ." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ message: "Dữ liệu yêu cầu không hợp lệ." }, { status: 400 });
  }

  let baseUrl: string;
  try {
    baseUrl = getBackendBaseUrl();
  } catch {
    return NextResponse.json({ message: "Chưa cấu hình địa chỉ máy chủ API." }, { status: 502 });
  }

  try {
    const upstream = await fetch(`${baseUrl}${upstreamPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: request.signal,
    });

    if (upstream.status === 204) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    const text = await upstream.text();
    if (contentType.includes("application/json") && text.trim()) {
      try {
        return NextResponse.json(JSON.parse(text), { status: upstream.status });
      } catch {
        // Fall through
      }
    }
    return NextResponse.json(
      text.trim() ? { ok: upstream.ok, message: text.trim() } : { ok: upstream.ok },
      { status: upstream.status },
    );
  } catch {
    return NextResponse.json({ message: "Không thể kết nối máy chủ xác thực." }, { status: 502 });
  }
}
