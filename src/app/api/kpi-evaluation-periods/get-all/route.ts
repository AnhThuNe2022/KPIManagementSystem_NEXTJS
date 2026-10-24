import { proxyApiRequest } from "@/lib/api/proxy";

export async function POST(request: Request) {
  return proxyApiRequest(request, "/kpi-evaluation-periods/get-all");
}
