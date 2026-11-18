import { proxyApiRequest } from "@/lib/api/proxy";

export function POST(request: Request) {
  return proxyApiRequest(request, "/kpi-evaluation-periods/create");
}
