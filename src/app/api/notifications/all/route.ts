import { proxyApiRequest } from "@/lib/api/proxy";

export async function DELETE(request: Request) {
  return proxyApiRequest(request, "/Notifications/all" + new URL(request.url).search);
}
