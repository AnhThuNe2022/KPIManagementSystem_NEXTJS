
import { NextResponse, type NextRequest } from "next/server";
import { appConfig } from "@/config/app";

function isTokenExpired(token: string): boolean {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return true;

        const payload = parts[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        const decoded = JSON.parse(atob(payload));

        // console.log("[Middleware] JWT Payload:", decoded);
        // console.log("[Middleware] Current:", Math.floor(Date.now() / 1000));
        // console.log("[Middleware] Exp:", decoded.exp);

        if (typeof decoded.exp !== "number") return true;

        return decoded.exp <= Math.floor(Date.now() / 1000);
    } catch (error) {
        console.error("[Middleware] JWT decode error:", error);
        return true;
    }
}

function redirectToLogin(request: NextRequest, reason: string) {
    console.log("[Middleware] Redirect:", reason);

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);

    const response = NextResponse.redirect(loginUrl);
    response.headers.set("X-Auth-Debug", reason);

    return response;
}

export function middleware(request: NextRequest) {
    const token = request.cookies.get(appConfig.authCookieName)?.value;

    // console.log("[Middleware] Path:", request.nextUrl.pathname);
    // console.log("[Middleware] Cookie name:", appConfig.authCookieName);
    // console.log("[Middleware] Has token:", !!token);

    if (!token) {
        return redirectToLogin(request, "NO_TOKEN");
    }

    if (isTokenExpired(token)) {
        const response = redirectToLogin(request, "TOKEN_EXPIRED_OR_INVALID");
        response.cookies.delete(appConfig.authCookieName);
        return response;
    }

    console.log("[Middleware] Auth passed");

    const response = NextResponse.next();
    response.headers.set("X-Auth-Debug", "AUTH_PASSED");

    return response;
}

export const config = {
    matcher: [
        "/((?!api|login|_next/static|_next/image|favicon.ico|.*\\..*).*)",
    ],
};
