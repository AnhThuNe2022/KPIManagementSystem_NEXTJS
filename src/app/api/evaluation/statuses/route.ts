import { proxyApiRequest } from "@/lib/api/proxy";

export async function GET(request: Request) {
  const templateId = new URL(request.url).searchParams.get("templateid") ?? "";
  const query = new URLSearchParams({ "Filters[templateid]": templateId, "Filters[isactive]": "true" });
  return proxyApiRequest(request, "/TemplateLevel/get-all-status?" + query);
}
