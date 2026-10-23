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
  const level = Number(params.get("rolePage"));

  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100 ||
    ![UserRoleSystem.ManagerMid, UserRoleSystem.HR].includes(level)
  ) {
    return NextResponse.json({ message: "Invalid pagination or review role" }, { status: 400 });
  }

  const isHR = level === UserRoleSystem.HR;
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    rolePage: isHR ? "HR" : "ManagerMid",
  });
  const keys = [
    "keyword",
    "status",
    "from",
    "to",
    "sortBy",
    "companyId",
    ...(isHR ? ["departmentId", "typeId", "periodId"] : []),
  ];

  for (const key of keys) {
    const value = params.get(key)?.trim();
    if (!value) {
      continue;
    }

    const invalidId = key.endsWith("Id") && !/^[1-9]\d*$/.test(value);
    const invalidStatus = key === "status" && !["Approved", "Rejected"].includes(value);
    const invalidSort =
      key === "sortBy" &&
      !["date_desc", "date_asc", "employee_asc", "employee_desc"].includes(value);
    const invalidDate =
      (key === "from" || key === "to") &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value);

    if (value.length > 200 || invalidId || invalidStatus || invalidSort || invalidDate) {
      return NextResponse.json({ message: "Invalid reviewed evaluation filter" }, { status: 400 });
    }

    const queryKey = !isHR && key === "companyId" ? "CompanyId" : key;
    query.set(queryKey, value);
  }

  const from = query.get("from");
  const to = query.get("to");
  if (from && to && from > to) {
    return NextResponse.json({ message: "Invalid date range" }, { status: 400 });
  }

  try {
    const result = await apiClient(`/KPIEvaluation/reviewed?${query}`, {
      signal: request.signal,
    });
    return NextResponse.json(result);
  } catch (error) {
    const status = getApiErrorStatus(error);

    return NextResponse.json({ message: "Unable to load reviewed evaluations" }, { status });
  }
}
