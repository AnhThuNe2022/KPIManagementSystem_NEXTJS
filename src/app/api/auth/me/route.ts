import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { appConfig } from "@/config/app";

export async function GET() {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get(
      appConfig.authCookieName
    )?.value;

    const userId = cookieStore.get(
      "auth_user_id"
    )?.value;

    const rolesCookie = cookieStore.get(
      "auth_roles"
    )?.value;

    if (!token || !userId) {
      return NextResponse.json(
        { user: null },
        { status: 401 }
      );
    }

    let roles: string[] = [];

    if (rolesCookie) {
      try {
        roles = JSON.parse(rolesCookie);
      } catch {
        roles = [];
      }
    }

    return NextResponse.json({
      user: {
        id: userId,
        roles,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/auth/me error:",
      error
    );

    return NextResponse.json(
      { user: null },
      { status: 500 }
    );
  }
}