import { proxyApiRequest } from "@/lib/api/proxy";

export async function GET(request: Request) {
  return proxyApiRequest(request, "/role" + new URL(request.url).search);
}
