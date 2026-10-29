import { proxyApiRequest } from "@/lib/api/proxy";

export function GET(request: Request) {
  return proxyApiRequest(request, "/menus/tree");
}
