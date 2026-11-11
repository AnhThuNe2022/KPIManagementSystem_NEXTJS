import { proxyApiRequest } from "@/lib/api/proxy";

export function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  query.set("byunithrcompile", "true");
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
