import { proxyApiRequest } from "@/lib/api/proxy";

export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  return proxyApiRequest(request, `/employeeinfor/password/${encodeURIComponent(userId)}`);
}
