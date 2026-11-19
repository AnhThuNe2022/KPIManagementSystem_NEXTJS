import { proxyApiRequest } from "@/lib/api/proxy";

export async function POST(request: Request) {
  return proxyApiRequest(request, "/ConditionAssignments/get-all-paged");
}
