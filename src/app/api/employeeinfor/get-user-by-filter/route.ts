import { proxyApiRequest } from "@/lib/api/proxy";

export async function GET(request: Request) {
  return proxyApiRequest(request, "/employeeInfor/get-user-by-filter" + new URL(request.url).search);
}
