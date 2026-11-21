import { NextResponse } from "next/server";
import { BACKEND_PATHS } from "@/server/adapters/backendContracts";
import { proxyApiRequest, readJsonBody } from "@/server/api/proxy";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyid")?.trim() ?? "";
  const name = searchParams.get("name")?.trim() ?? "";
  const byUnitHrCompile = searchParams.get("byunithrcompile");

  const query = new URLSearchParams();
  if (byUnitHrCompile !== "false") {
    query.set("Filters[byunithrcompile]", "true");
  }
  if (companyId) query.set("Filters[companyid]", companyId);
  if (name) query.set("Filters[name]", name);

  return proxyApiRequest(request, `${BACKEND_PATHS.departmentGetByFilter}?${query.toString()}`, {
    method: "GET",
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }
  return proxyApiRequest(request, BACKEND_PATHS.departmentCreate, {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }
  return proxyApiRequest(request, BACKEND_PATHS.departmentUpdate, {
    method: "PUT",
    body: JSON.stringify(body ?? {}),
  });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ message: "Department id is required" }, { status: 400 });
  }
  return proxyApiRequest(request, BACKEND_PATHS.departmentDelete(id), {
    method: "DELETE",
  });
}
