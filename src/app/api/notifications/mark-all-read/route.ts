import { proxyApiRequest } from "@/lib/api/proxy";

export async function POST(request: Request) {
  return proxyApiRequest(request, "/Notifications/mark-all-read" + new URL(request.url).search);
}
