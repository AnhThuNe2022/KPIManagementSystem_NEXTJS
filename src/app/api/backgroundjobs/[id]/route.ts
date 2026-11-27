import { proxyApiRequest } from "@/lib/api/proxy";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  return proxyApiRequest(request, "/backgroundjobs/" + encodeURIComponent(id));
}

