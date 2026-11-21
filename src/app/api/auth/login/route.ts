import { NextResponse } from "next/server";
import { BACKEND_PATHS } from "@/server/adapters/backendContracts";
import { getBackendBaseUrl } from "@/server/api/client";
import { setAuthCookies } from "@/server/api/cookies";
import { isSameOriginMutation } from "@/server/api/proxy";

interface LoginUpstreamResponse {
  token?: string;
  userId?: string;
  roles?: string[];
  message?: string;
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request, "POST")) {
    return NextResponse.json({ message: "Invalid origin" }, { status: 403 });
  }

  let body: { username?: unknown; password?: unknown };
  try {
    body = (await request.json()) as { username?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ message: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu." }, { status: 400 });
  }

  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json({ message: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu." }, { status: 400 });
  }

  let baseUrl: string;
  try {
    baseUrl = getBackendBaseUrl();
  } catch {
    return NextResponse.json({ message: "Chưa cấu hình AUTH_API_URL." }, { status: 502 });
  }

  try {
    const upstream = await fetch(`${baseUrl}${BACKEND_PATHS.authLogin}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailOrUserName: username, password }),
      cache: "no-store",
      signal: request.signal,
    });

    const raw = await upstream.text();
    let data: LoginUpstreamResponse = {};
    if (raw.trim()) {
      try {
        data = JSON.parse(raw) as LoginUpstreamResponse;
      } catch {
        data = {};
      }
    }

    if (!upstream.ok || !data.token || !data.userId) {
      const status = upstream.status === 401 || upstream.status === 400 ? upstream.status : 401;
      return NextResponse.json(
        { message: data.message || "Tên đăng nhập hoặc mật khẩu không chính xác." },
        { status },
      );
    }

    const response = NextResponse.json({ ok: true }, { status: 200 });
    setAuthCookies(response, {
      token: data.token,
      userId: String(data.userId),
      roles: Array.isArray(data.roles) ? data.roles.map(String) : [],
      userName: username,
    });
    return response;
  } catch {
    return NextResponse.json({ message: "Không thể kết nối đến máy chủ đăng nhập." }, { status: 502 });
  }
}
