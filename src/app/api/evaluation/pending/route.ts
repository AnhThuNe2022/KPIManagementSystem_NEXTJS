import { NextResponse } from "next/server";
import { BACKEND_PATHS } from "@/server/adapters/backendContracts";
import { proxyApiRequest } from "@/server/api/proxy";

const ALLOWED_LEVELS = new Set([2, 5]);
const FILTER_KEYS = ["companyId", "departmentId", "periodId", "keyword", "sortBy"] as const;

export async function GET(request: Request) {
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
    !ALLOWED_LEVELS.has(level)
  ) {
    return NextResponse.json({ message: "Invalid pagination or review level" }, { status: 400 });
  }

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    level: String(level),
  });

  for (const key of FILTER_KEYS) {
    const value = params.get(key)?.trim();
    if (value && value.length > 200) {
      return NextResponse.json({ message: "Filter value is too long" }, { status: 400 });
    }
    if (value) query.set(key, value);
  }

  return proxyApiRequest(request, `${BACKEND_PATHS.evaluationPending}?${query.toString()}`, {
    method: "GET",
  });
}
