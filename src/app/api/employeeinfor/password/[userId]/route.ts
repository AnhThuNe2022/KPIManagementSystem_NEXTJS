import { NextResponse } from "next/server";
import { BACKEND_PATHS } from "@/server/adapters/backendContracts";
import { proxyApiRequest, readJsonBody } from "@/server/api/proxy";

export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  if (!userId?.trim()) {
    return NextResponse.json({ message: "userId is required" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }
  return proxyApiRequest(request, BACKEND_PATHS.employeePassword(userId), {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
}
