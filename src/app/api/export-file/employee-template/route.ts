import { BACKEND_PATHS } from "@/server/adapters/backendContracts";
import { proxyApiRequest } from "@/server/api/proxy";

export async function GET(request: Request) {
  const { search } = new URL(request.url);
  return proxyApiRequest(request, `${BACKEND_PATHS.exportEmployeeTemplate}${search}`, {
    method: "GET",
    responseType: "response",
  });
}
