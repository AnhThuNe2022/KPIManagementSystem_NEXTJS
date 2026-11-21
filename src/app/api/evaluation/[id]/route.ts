import { NextResponse } from "next/server";
import { BACKEND_PATHS, POSITIVE_INT_ID_RE } from "@/server/adapters/backendContracts";
import { proxyApiRequest, readJsonBody } from "@/server/api/proxy";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!POSITIVE_INT_ID_RE.test(id)) {
    return NextResponse.json({ message: "Invalid evaluation id" }, { status: 400 });
  }
  return proxyApiRequest(request, BACKEND_PATHS.evaluationById(id), { method: "DELETE" });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!POSITIVE_INT_ID_RE.test(id)) {
    return NextResponse.json({ message: "Invalid evaluation id" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }
  return proxyApiRequest(request, BACKEND_PATHS.evaluationById(id), {
    method: "PATCH",
    body: JSON.stringify(body ?? {}),
  });
}
