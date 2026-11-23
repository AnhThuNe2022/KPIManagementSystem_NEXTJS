import { proxyApiRequest } from "@/lib/api/proxy";

export async function GET(request: Request) {
  return proxyApiRequest(
    request,
    "/ExportFile/download-template" + new URL(request.url).search,
    { responseType: "response" },
  );
}
