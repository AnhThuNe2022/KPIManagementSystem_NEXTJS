import { NextResponse } from "next/server";
import { proxyApiRequest } from "@/lib/api/proxy";

type Context = { params: Promise<{ segments?: string[] }> };

async function handle(request: Request, context: Context) {
  const { segments = [] } = await context.params;
  if (segments.length > 3 || segments.some(value => !/^[a-zA-Z0-9_.-]+$/.test(value) || value === "." || value === "..")) {
    return NextResponse.json({ message: "Invalid permission path" }, { status: 400 });
  }
  if (segments.length > 1 && !["menus", "roles", "users"].includes(segments[1])) {
    return NextResponse.json({ message: "Invalid assignment type" }, { status: 400 });
  }
  const lengths: Record<string, number[]> = { GET: [0, 1, 2], POST: [0, 3], PUT: [1], DELETE: [1, 3] };
  if (!lengths[request.method]?.includes(segments.length)) {
    return NextResponse.json({ message: "Method not allowed" }, { status: 405 });
  }

  const path = segments.length ? "/" + segments.map(encodeURIComponent).join("/") : "";
  return proxyApiRequest(request, "/permission" + path + new URL(request.url).search);
}
export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
