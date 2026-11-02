import { EvaluationStatus, type ReviewRole } from "@/features/evaluation/types";
import { UserRoleSystem } from "@/features/auth/types";
import { request } from "@/lib/api/request";
import { companyApi } from "@/features/company/services/companyApi";
import { departmentApi } from "@/features/department/services/departmentApi";
import type { EvaluationPeriodDto, EvaluationTypeDto } from "../types";

export const evaluationLookupApi = {
  getCompanies(level: ReviewRole, signal?: AbortSignal) {
    return level === UserRoleSystem.HR
      ? companyApi.getCompaniesByManager({ filters: { byunithrcompile: "1" } }, signal)
      : companyApi.getAll(signal);
  },
  getDepartments(companyId: string, level: ReviewRole, signal?: AbortSignal) {
    return departmentApi.getAll(companyId, { byScope: level === UserRoleSystem.HR, signal });
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
