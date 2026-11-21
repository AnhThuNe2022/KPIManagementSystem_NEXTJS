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

  if (body !== undefined && (typeof body !== "object" || body === null || Array.isArray(body))) {
    return NextResponse.json({ message: "Body must be a JSON object" }, { status: 400 });
  }

  return proxyApiRequest(request, BACKEND_PATHS.companyByManager, {
    method: "POST",
    body: JSON.stringify(body ?? { filters: {} }),
  });
}
