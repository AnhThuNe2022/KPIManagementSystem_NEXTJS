import { proxyApiRequest } from "@/lib/api/proxy";

export async function GET(request: Request) {
  return proxyApiRequest(request, "/notifications/conversation" + new URL(request.url).search);
}
