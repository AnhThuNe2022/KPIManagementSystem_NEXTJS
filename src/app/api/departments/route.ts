import { proxyApiRequest } from "@/lib/api/proxy";

export function GET(request: Request) {
  const source = new URL(request.url).searchParams;
  const query = new URLSearchParams({ byunithrcompile: "true" });
  const companyId = source.get("companyid")?.trim();
  const name = source.get("name")?.trim();
  if (companyId) query.set("Filters[companyid]", companyId);
  if (name) query.set("Filters[name]", name);
  return proxyApiRequest(request, "/department/get-by-filter?" + query);
}

export function POST(request: Request) {
  return proxyApiRequest(request, "/Department/dto");
}

export function PUT(request: Request) {
  return proxyApiRequest(request, "/Department/updatedto");
}

export function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  return proxyApiRequest(request, "/Department/" + encodeURIComponent(id));
}
