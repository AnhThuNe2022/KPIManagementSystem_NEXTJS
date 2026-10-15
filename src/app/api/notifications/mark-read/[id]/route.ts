import { proxyApiRequest } from "@/lib/api/proxy";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxyApiRequest(request, "/Notifications/mark-read/" + encodeURIComponent(id) + new URL(request.url).search);
}
