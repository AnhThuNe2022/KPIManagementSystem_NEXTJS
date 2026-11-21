import { NextResponse } from "next/server";
import { BACKEND_PATHS, POSITIVE_INT_ID_RE } from "@/server/adapters/backendContracts";
import { proxyApiRequest } from "@/server/api/proxy";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!POSITIVE_INT_ID_RE.test(id)) {
    return NextResponse.json({ message: "Invalid evaluation id" }, { status: 400 });
  }
  return proxyApiRequest(request, BACKEND_PATHS.evaluationApprovalFilter, {
    method: "POST",
    body: JSON.stringify({ Filters: { KpiId: id } }),
  });
}
