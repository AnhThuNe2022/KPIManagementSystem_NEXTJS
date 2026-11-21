import { BACKEND_PATHS } from "@/server/adapters/backendContracts";
import { proxyApiRequest } from "@/server/api/proxy";

export async function GET(request: Request) {
  return proxyApiRequest(request, BACKEND_PATHS.menusTree, { method: "GET" });
}
