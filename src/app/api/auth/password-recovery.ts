export async function postPasswordRecovery(request: Request, action: "forgot-password" | "reset-password") {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ message: "Yêu cầu không hợp lệ." }, { status: 403 });
  }

  const apiUrl = process.env.AUTH_API_URL?.replace(/\/$/, "");
  if (!apiUrl) {
    return Response.json({ message: "Dịch vụ đặt lại mật khẩu đang gián đoạn." }, { status: 502 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  try {
    const response = await fetch(`${apiUrl}/auth/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: request.signal,
    });
    const data = await response.json().catch(() => null);
    if (response.status === 204) return Response.json({ ok: true });
    return Response.json(data ?? { ok: response.ok }, { status: response.status });
  } catch {
    return Response.json({ message: "Không thể kết nối máy chủ. Vui lòng thử lại sau." }, { status: 502 });
  }
}
