import { NextResponse } from "next/server";
import { clearAllAuthCookies } from "@/server/api/cookies";
import { isSameOriginMutation } from "@/server/api/proxy";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request, "POST")) {
    return NextResponse.json({ message: "Invalid origin" }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true }, { status: 200 });
  clearAllAuthCookies(response);
  return response;
}
