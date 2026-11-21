import { BACKEND_PATHS } from "@/server/adapters/backendContracts";
import { proxyApiRequest } from "@/server/api/proxy";

export async function POST(request: Request) {
  const { search } = new URL(request.url);
  return proxyApiRequest(request, `${BACKEND_PATHS.notificationsMarkAllRead}${search}`, {
    method: "POST",
  });
}

export async function PUT(request: Request) {
  return POST(request);
}
