import { proxyApiRequest } from "@/lib/api/proxy";

export async function GET(request: Request) {
  return proxyApiRequest(request, "/jobposition" + new URL(request.url).search);
}
