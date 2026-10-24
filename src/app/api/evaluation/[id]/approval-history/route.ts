import { proxyApiRequest } from "@/lib/api/proxy";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxyApiRequest(request, "/KPIEvaluationApproval/filter", {
    method: "POST", body: JSON.stringify({ Filters: { KpiId: id } }),
  });
}
