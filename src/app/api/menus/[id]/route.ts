import { proxyApiRequest } from "@/lib/api/proxy";

type Context = { params: Promise<{ id: string }> };

async function handle(request: Request, { params }: Context) {
  const { id } = await params;
  return proxyApiRequest(request, "/menus/" + encodeURIComponent(id));
}

export { handle as PUT, handle as DELETE };
