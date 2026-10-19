import {
  EvaluationStatus,
  UserRoleSystem,
  type EvaluationFilterOption,
  type EvaluationTypeOption,
  type ReviewRole,
} from "@/types/evaluation";
import { request } from "./evaluationRequest";

function filterOptions(data: unknown, label: "companyName" | "name"): EvaluationFilterOption[] {
  if (!Array.isArray(data)) throw new Error("INVALID_FILTER_RESPONSE");
  return data.map((row) => {
    if (
      !row ||
      !Number.isSafeInteger(row.id) ||
      row.id < 1 ||
      typeof row[label] !== "string" ||
      !row[label].trim()
    ) {
      throw new Error("INVALID_FILTER_RESPONSE");
    }
    return { id: String(row.id), name: row[label].trim() };
  });
}

export const evaluationLookupApi = {
  async getCompanies(level: ReviewRole, signal?: AbortSignal) {
    const data =
      level === UserRoleSystem.HR
        ? await request("/company/by-manager", {
            method: "POST",
            body: JSON.stringify({ filters: { byunithrcompile: "1" } }),
            signal,
          })
        : await request("/company/all", { signal });
    return filterOptions(data, "companyName");
  },

  async getDepartments(companyId: string, level: ReviewRole, signal?: AbortSignal) {
    const params = new URLSearchParams();
    if (companyId) params.set("Filters[companyid]", companyId);
    if (level === UserRoleSystem.HR) params.set("byscope", "true");
    return filterOptions(
      await request(`/department/get-all-department?${params}`, { signal }),
      "name",
    );
  },

  async getPeriods(signal?: AbortSignal) {
    return filterOptions(
      await request("/kpi-evaluation-periods/get-all", {
        method: "POST",
        body: JSON.stringify({
          isactive: "true",
          isevaluationenable: "true",
          status: EvaluationStatus.DirectManagerReviewing,
        }),
        signal,
      }),
      "name",
    );
  },

  async getTypes(signal?: AbortSignal): Promise<EvaluationTypeOption[]> {
    const data = await request("/kpi-evaluation-types/get-all", {
      method: "POST",
      body: "{}",
      signal,
    });
    const options = filterOptions(data, "name");
    return options.map((option, index) => ({
      ...option,
      periods: filterOptions(
        (data as { listKPIEvaluationPeriodDto: unknown }[])[index].listKPIEvaluationPeriodDto,
        "name",
      ),
    }));
  },
};
