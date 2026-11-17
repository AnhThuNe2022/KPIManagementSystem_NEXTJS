import { proxyApiRequest } from "@/lib/api/proxy";

export async function GET(request: Request) {
  return proxyApiRequest(request, "/KPIEvaluation/pending" + new URL(request.url).search);
}
