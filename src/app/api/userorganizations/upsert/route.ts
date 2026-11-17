import { NextResponse } from "next/server";
import { proxyApiRequest } from "@/lib/api/proxy";

export async function POST(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ message: "userId is required" }, { status: 400 });
  }
  return proxyApiRequest(request, `/userorganizations/upsert?userId=${encodeURIComponent(userId)}`);
}
