import { proxyApiRequest } from "@/lib/api/proxy";

export async function GET(request: Request) {
  return proxyApiRequest(
    request,
    "/ConditionAssignments/responsible-hr" + new URL(request.url).search,
  );
}
