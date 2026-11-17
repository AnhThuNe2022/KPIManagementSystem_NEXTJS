import { NextResponse } from "next/server";
import { proxyApiRequest } from "@/lib/api/proxy";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[1-9]\d*$/.test(id)) return NextResponse.json({ message: "Invalid evaluation ID" }, { status: 400 });
  return proxyApiRequest(request, "/KPIEvaluation/" + id);
}
