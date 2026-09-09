import { NextResponse } from "next/server";
import { authenticate } from "@/lib/api/auth";
import type { LoginCredentials } from "@/types/auth";

export async function POST(request: Request) {
  try {

    const body = (await request.json()) as Partial<LoginCredentials>;

    if (!body.username?.trim() || !body.password) {
      return NextResponse.json(
        {
          message: "Vui lòng nhập tên đăng nhập và mật khẩu.",
        },
        { status: 400 }
      );
    }

    await authenticate({
      username: body.username.trim(),
      password: body.password,
    });

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      {
        message: "Tên đăng nhập hoặc mật khẩu không chính xác.",
      },
      { status: 401 }
    );
  }
}