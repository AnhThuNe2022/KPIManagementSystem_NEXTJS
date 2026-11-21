import { NextResponse } from "next/server";
import { BACKEND_PATHS } from "@/server/adapters/backendContracts";
import { proxyApiRequest } from "@/server/api/proxy";

export async function GET(request: Request) {
  const templateId = new URL(request.url).searchParams.get("templateid")?.trim() ?? "";
  if (!templateId) {
    return NextResponse.json({ message: "templateid is required" }, { status: 400 });
  }
  const query = new URLSearchParams({
    "Filters[templateid]": templateId,
    "Filters[isactive]": "true",
  });
  return proxyApiRequest(request, `${BACKEND_PATHS.evaluationStatuses}?${query.toString()}`, {
    method: "GET",
  });
}
