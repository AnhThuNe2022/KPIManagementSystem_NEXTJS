import { NextResponse } from "next/server";
import { appConfig } from "@/config/app";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(appConfig.authCookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  response.cookies.set(appConfig.userNameCookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}
