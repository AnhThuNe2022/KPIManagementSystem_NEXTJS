import { NextResponse, type NextRequest } from "next/server";
import { appConfig } from "@/config/app";

export function middleware(request: NextRequest) {
  if (!request.cookies.has(appConfig.authCookieName)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!login|_next/static|_next/image|favicon.ico|.*\\..*).*)",
    ],
};