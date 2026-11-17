import { proxyApiRequest } from "@/lib/api/proxy";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxyApiRequest(request, "/Notifications/" + encodeURIComponent(id) + new URL(request.url).search);
}
