import { NextResponse } from "next/server";
import { BACKEND_PATHS } from "@/server/adapters/backendContracts";
import { proxyApiRequest } from "@/server/api/proxy";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id?.trim()) return NextResponse.json({ message: "Invalid notification id" }, { status: 400 });
  const { search } = new URL(request.url);
  return proxyApiRequest(request, `${BACKEND_PATHS.notificationsMarkRead(id)}${search}`, {
    method: "POST",
  });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return POST(request, context);
}
