import { NextResponse } from "next/server";
import { proxyEvaluationRequest } from "../../proxyEvaluationRequest";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    return NextResponse.json({ message: "Invalid evaluation ID" }, { status: 400 });
  }
  return proxyEvaluationRequest("/KPIEvaluationApproval/filter", {
    method: "POST",
    body: JSON.stringify({ Filters: { KpiId: id } }),
    signal: request.signal,
  });
}
