import { NextResponse } from "next/server";
import { BACKEND_PATHS } from "@/server/adapters/backendContracts";
import { proxyApiRequest } from "@/server/api/proxy";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id?.trim()) return NextResponse.json({ message: "Invalid notification id" }, { status: 400 });
  const { search } = new URL(request.url);
  return proxyApiRequest(request, `${BACKEND_PATHS.notificationsById(id)}${search}`, {
    method: "DELETE",
  });
}
