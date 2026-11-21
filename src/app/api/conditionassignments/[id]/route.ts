import { NextResponse } from "next/server";
import { BACKEND_PATHS } from "@/server/adapters/backendContracts";
import { proxyApiRequest, readJsonBody } from "@/server/api/proxy";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }
  return proxyApiRequest(request, BACKEND_PATHS.conditionById(id), {
    method: "PUT",
    body: JSON.stringify(body ?? {}),
  });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }
  return proxyApiRequest(request, BACKEND_PATHS.conditionById(id), { method: "DELETE" });
}
