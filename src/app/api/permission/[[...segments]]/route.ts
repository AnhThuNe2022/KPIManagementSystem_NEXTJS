import { NextResponse } from "next/server";
import { BACKEND_PATHS, PERMISSION_SEGMENT_RE } from "@/server/adapters/backendContracts";
import { proxyApiRequest, readJsonBody } from "@/server/api/proxy";

const ALLOWED_TABS = new Set(["menus", "roles", "users"]);
const ALLOWED_LENGTHS: Record<string, Set<number>> = {
  GET: new Set([0, 1, 2]),
  POST: new Set([0, 3]),
  PUT: new Set([1]),
  DELETE: new Set([1, 3]),
};

async function handlePermission(
  request: Request,
  context: { params: Promise<{ segments?: string[] }> },
  method: "GET" | "POST" | "PUT" | "DELETE",
) {
  const { segments = [] } = await context.params;
  if (segments.length > 3) {
    return NextResponse.json({ message: "Invalid permission path" }, { status: 400 });
  }
  for (const seg of segments) {
    if (!seg || seg === "." || seg === ".." || !PERMISSION_SEGMENT_RE.test(seg)) {
      return NextResponse.json({ message: "Invalid path segment" }, { status: 400 });
    }
  }
  if (segments.length > 1 && !ALLOWED_TABS.has(segments[1])) {
    return NextResponse.json({ message: "Invalid permission assignment tab" }, { status: 400 });
  }
  if (!ALLOWED_LENGTHS[method].has(segments.length)) {
    return NextResponse.json({ message: "Method not allowed for this permission path" }, { status: 405 });
  }

  const { search } = new URL(request.url);
  const upstreamPath = `${BACKEND_PATHS.permissionPath(segments)}${search}`;

  if (method === "POST" || method === "PUT") {
    let body: unknown;
    try {
      body = await readJsonBody(request);
    } catch {
      return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
    }
    return proxyApiRequest(request, upstreamPath, {
      method,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  return proxyApiRequest(request, upstreamPath, { method });
}

export function GET(request: Request, context: { params: Promise<{ segments?: string[] }> }) {
  return handlePermission(request, context, "GET");
}

export function POST(request: Request, context: { params: Promise<{ segments?: string[] }> }) {
  return handlePermission(request, context, "POST");
}

export function PUT(request: Request, context: { params: Promise<{ segments?: string[] }> }) {
  return handlePermission(request, context, "PUT");
}

export function DELETE(request: Request, context: { params: Promise<{ segments?: string[] }> }) {
  return handlePermission(request, context, "DELETE");
}
