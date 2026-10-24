import { proxyApiRequest } from "@/lib/api/proxy";
import { UserRoleSystem } from "@/types/evaluation";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const roles: Record<string, string> = { [UserRoleSystem.HR]: "HR", [UserRoleSystem.ManagerMid]: "ManagerMid" };
  const role = roles[query.get("rolePage") ?? ""];
  if (role) query.set("rolePage", role);
  if (role === "ManagerMid" && query.has("companyId")) {
    query.set("CompanyId", query.get("companyId")!);
    query.delete("companyId");
  }
  return proxyApiRequest(request, "/KPIEvaluation/reviewed?" + query);
}
