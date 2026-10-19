import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { appConfig } from "@/config/app";
import { apiClient } from "@/lib/api/client";
import { getApiErrorStatus } from "@/lib/api/errors";

export async function GET(request: Request) {
  if (!(await cookies()).has(appConfig.authCookieName)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await apiClient("/company/all", { signal: request.signal }));
  } catch (error) {
    const status = getApiErrorStatus(error);
    return NextResponse.json({ message: "Unable to load companies" }, { status });
  }
}
