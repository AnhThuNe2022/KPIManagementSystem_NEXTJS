import { NextResponse } from "next/server";
import { BACKEND_PATHS } from "@/server/adapters/backendContracts";
import { proxyApiRequest, readJsonBody } from "@/server/api/proxy";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }
  if (!Array.isArray(body) || body.length === 0) {
    return NextResponse.json({ message: "Items payload must be a non-empty array" }, { status: 400 });
  }
  return proxyApiRequest(request, BACKEND_PATHS.evaluationSendEmailAlert, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
