import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { appConfig } from "@/config/app";
import { apiClient } from "@/lib/api/client";
import { getApiErrorStatus } from "@/lib/api/errors";
import { UserRoleSystem } from "@/types/evaluation";

export async function GET(request: Request) {
  if (!(await cookies()).has(appConfig.authCookieName)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page") ?? 1);
  const pageSize = Number(params.get("pageSize") ?? 20);
  const level = Number(params.get("level"));
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100 ||
    ![UserRoleSystem.ManagerMid, UserRoleSystem.HR].includes(level)
  ) {
    return NextResponse.json({ message: "Invalid pagination or review level" }, { status: 400 });
  }

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    level: String(level),
  });
  for (const key of ["companyId", "departmentId", "periodId", "keyword", "sortBy"]) {
    const value = params.get(key)?.trim();
    if (value && value.length > 200) {
      return NextResponse.json({ message: "Filter value is too long" }, { status: 400 });
    }
    if (value) query.set(key, value);
  }

  try {
    return NextResponse.json(
      await apiClient(`/KPIEvaluation/pending?${query}`, { signal: request.signal }),
    );
  } catch (error) {
    const status = getApiErrorStatus(error);
    return NextResponse.json({ message: "Unable to load pending evaluations" }, { status });
  }
}
