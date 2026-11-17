import { NextResponse } from "next/server";
import { proxyApiRequest } from "@/lib/api/proxy";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ message: "Invalid company filters" }, { status: 400 });
  }
  return proxyApiRequest(request, "/company/by-manager", { body: JSON.stringify(body) });
}
