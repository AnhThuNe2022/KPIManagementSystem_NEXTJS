import { NextResponse } from "next/server";
import { BACKEND_PATHS } from "@/server/adapters/backendContracts";
import { proxyApiRequest } from "@/server/api/proxy";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ message: "Period id is required" }, { status: 400 });
  }
  return proxyApiRequest(request, BACKEND_PATHS.periodGetById(id), { method: "GET" });
}
