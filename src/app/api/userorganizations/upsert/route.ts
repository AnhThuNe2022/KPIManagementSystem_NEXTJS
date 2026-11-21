import { NextResponse } from "next/server";
import { BACKEND_PATHS } from "@/server/adapters/backendContracts";
import { proxyApiRequest, readJsonBody } from "@/server/api/proxy";

export async function POST(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId")?.trim() ?? "";
  if (!userId) {
    return NextResponse.json({ message: "userId query parameter is required" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }
  return proxyApiRequest(request, BACKEND_PATHS.userOrgUpsert(userId), {
    method: "POST",
    body: JSON.stringify(body ?? []),
  });
}
