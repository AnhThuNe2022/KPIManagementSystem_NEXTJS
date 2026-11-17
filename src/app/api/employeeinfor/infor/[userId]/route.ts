import { proxyApiRequest } from "@/lib/api/proxy";

export async function GET(request: Request, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  return proxyApiRequest(request, `/employeeinfor/infor/${encodeURIComponent(userId)}`);
}
