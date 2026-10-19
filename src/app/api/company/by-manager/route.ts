import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { appConfig } from "@/config/app";
import { apiClient } from "@/lib/api/client";
import { getApiErrorStatus } from "@/lib/api/errors";

export async function POST(request: Request) {
  if (!(await cookies()).has(appConfig.authCookieName)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ message: "Invalid company filters" }, { status: 400 });
  }
  try {
    return NextResponse.json(
      await apiClient("/company/by-manager", {
        method: "POST",
        body: JSON.stringify(body),
        signal: request.signal,
      }),
    );
  } catch (error) {
    const status = getApiErrorStatus(error);
    return NextResponse.json({ message: "Unable to load scoped companies" }, { status });
  }
}
