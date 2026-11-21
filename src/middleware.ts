import { NextResponse, type NextRequest } from "next/server";
import { appConfig } from "@/config/app";
import { clearAllAuthCookies, isJwtUnexpired } from "@/server/api/cookies";

const PUBLIC_PATHS = new Set(["/login", "/reset-password"]);

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith("/dev/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(appConfig.authCookieName)?.value;
  if (!token || !isJwtUnexpired(token)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    if (pathname && pathname !== "/") {
      loginUrl.searchParams.set("next", `${pathname}${search}`);
    } else {
      loginUrl.search = "";
    }
    const response = NextResponse.redirect(loginUrl);
    if (token) {
      clearAllAuthCookies(response);
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|login|reset-password|_next/static|_next/image|favicon\\.ico|.*\\..*).*)"],
};
