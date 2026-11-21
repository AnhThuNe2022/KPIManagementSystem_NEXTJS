import { NextResponse } from "next/server";
import { BACKEND_PATHS, mapReviewedRolePage } from "@/server/adapters/backendContracts";
import { proxyApiRequest } from "@/server/api/proxy";

const FORWARD_KEYS = [
  "page",
  "pageSize",
  "keyword",
  "departmentId",
  "typeId",
  "periodId",
  "status",
  "from",
  "to",
  "sortBy",
] as const;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const rolePage = mapReviewedRolePage(params.get("rolePage"));
  if (!rolePage || (rolePage !== "HR" && rolePage !== "ManagerMid")) {
    return NextResponse.json({ message: "Invalid rolePage" }, { status: 400 });
  }

  const query = new URLSearchParams({ rolePage });
  for (const key of FORWARD_KEYS) {
    const value = params.get(key)?.trim();
    if (value) query.set(key, value);
  }

  const companyId = (params.get("companyId") ?? params.get("CompanyId"))?.trim();
  if (companyId) {
    // Legacy .NET endpoint expects PascalCase CompanyId for ManagerMid
    query.set(rolePage === "ManagerMid" ? "CompanyId" : "companyId", companyId);
  }

  return proxyApiRequest(request, `${BACKEND_PATHS.evaluationReviewed}?${query.toString()}`, {
    method: "GET",
  });
}
