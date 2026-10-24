import { EvaluationStatus, UserRoleSystem, type ReviewRole } from "@/types/evaluation";
import type { CompanyDto, DepartmentDto } from "@/types/employee";
import { request } from "@/lib/api/request";

export type EvaluationPeriodDto = { id: number | string; name: string };
export type EvaluationTypeDto = EvaluationPeriodDto & { listKPIEvaluationPeriodDto: EvaluationPeriodDto[] };

export const evaluationLookupApi = {
  getCompanies(level: ReviewRole, signal?: AbortSignal) {
    return level === UserRoleSystem.HR
      ? request<CompanyDto[]>("/company/by-manager", { method: "POST", body: JSON.stringify({ filters: { byunithrcompile: "1" } }), signal })
      : request<CompanyDto[]>("/company/all", { signal });
  },
  getDepartments(companyId: string, level: ReviewRole, signal?: AbortSignal) {
    const query = new URLSearchParams();
    if (companyId) query.set("Filters[companyid]", companyId);
    if (level === UserRoleSystem.HR) query.set("byscope", "true");
    return request<DepartmentDto[]>("/department/get-all-department?" + query, { signal });
  },
  getPeriods(signal?: AbortSignal) {
    return request<EvaluationPeriodDto[]>("/kpi-evaluation-periods/get-all", {
      method: "POST",
      body: JSON.stringify({ isactive: "true", isevaluationenable: "true", status: EvaluationStatus.DirectManagerReviewing }),
      signal,
    });
  },
  getTypes(signal?: AbortSignal) {
    return request<EvaluationTypeDto[]>("/kpi-evaluation-types/get-all", { method: "POST", body: "{}", signal });
  },
};
