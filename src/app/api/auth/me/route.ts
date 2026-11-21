import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { appConfig } from "@/config/app";
import { clearAllAuthCookies, isJwtUnexpired } from "@/server/api/cookies";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(appConfig.authCookieName)?.value;
    const userId = cookieStore.get(appConfig.userIdCookieName)?.value;
    const rawRoles = cookieStore.get(appConfig.rolesCookieName)?.value;
    const userName = cookieStore.get(appConfig.userNameCookieName)?.value ?? undefined;

    if (!token || !userId || !isJwtUnexpired(token)) {
      const response = NextResponse.json({ user: null }, { status: 401 });
      if (token && !isJwtUnexpired(token)) {
        clearAllAuthCookies(response);
      }
      return response;
    }

    let roles: string[] = [];
    if (rawRoles) {
      try {
        const parsed = JSON.parse(rawRoles);
        if (Array.isArray(parsed)) roles = parsed.map(String);
      } catch {
        roles = [];
      }
    }

    return NextResponse.json({
      user: {
        id: userId,
        roles,
        username: userName,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
