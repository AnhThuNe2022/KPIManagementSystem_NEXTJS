import { NextResponse } from "next/server";
import { proxyEvaluationRequest } from "../proxyEvaluationRequest";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (
    !body ||
    !Number.isSafeInteger(body.EvalId) ||
    body.EvalId < 1 ||
    !Number.isSafeInteger(body.Status) ||
    body.Status < 0 ||
    (body.Reason != null && typeof body.Reason !== "string")
  ) {
    return NextResponse.json({ message: "Invalid status change" }, { status: 400 });
  }
  return proxyEvaluationRequest("/KPIEvaluation/ChangeStatusEval", {
    method: "POST",
    body: JSON.stringify({ EvalId: body.EvalId, Status: body.Status, Reason: body.Reason ?? "" }),
  });
}
