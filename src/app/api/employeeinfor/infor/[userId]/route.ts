import { NextResponse } from "next/server";
import { BACKEND_PATHS } from "@/server/adapters/backendContracts";
import { proxyApiRequest } from "@/server/api/proxy";

export async function GET(request: Request, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  if (!userId?.trim()) {
    return NextResponse.json({ message: "userId is required" }, { status: 400 });
  }
  return proxyApiRequest(request, BACKEND_PATHS.employeeInfor(userId), { method: "GET" });
}
