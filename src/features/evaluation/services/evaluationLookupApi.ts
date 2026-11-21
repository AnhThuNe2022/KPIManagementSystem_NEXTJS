import { EvaluationStatus } from "@/design-system/registries";
import { UserRoleSystem, type ReviewRole } from "@/features/auth/types";
import { companyApi } from "@/features/company/services/companyApi";
import { departmentApi } from "@/features/department/services/departmentApi";
import { request } from "@/lib/http/request";
import { unwrapApiData, type ApiResponse } from "@/server/api/types";
import type { EvaluationTypeOption, LookupOption } from "../types";

function toLookupOptions(raw: unknown, labelKey: string): LookupOption[] {
  const list = unwrapApiData(raw as unknown[] | ApiResponse<unknown[]> | null);
  if (!Array.isArray(list)) return [];
  const options: LookupOption[] = [];
  for (const row of list) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = rec.id;
    const label = rec[labelKey];
    if (id === undefined || id === null) continue;
    const name = typeof label === "string" ? label.trim() : String(label ?? "").trim();
    if (!name) continue;
    options.push({ id: String(id), name });
  }
  return options;
}

export const evaluationLookupApi = {
  async getCompanies(level: ReviewRole, signal?: AbortSignal): Promise<LookupOption[]> {
    const companies =
      level === UserRoleSystem.HR
        ? await companyApi.getForHrCompile(signal)
        : await companyApi.getAll(signal);
    return companies.map((c) => ({ id: String(c.id), name: c.companyName }));
  },

  async getDepartments(
    companyId: string,
    level: ReviewRole,
    signal?: AbortSignal,
  ): Promise<LookupOption[]> {
    if (!companyId.trim()) return [];
    const depts = await departmentApi.getAll(companyId, {
      byScope: level === UserRoleSystem.HR,
      signal,
    });
    return depts.map((d) => ({ id: String(d.id), name: d.name }));
  },

  /** Preserves exact legacy payload sent to /api/kpi-evaluation-periods/get-all. */
  async getPeriods(signal?: AbortSignal): Promise<LookupOption[]> {
    const raw = await request("/kpi-evaluation-periods/get-all", {
      method: "POST",
      body: JSON.stringify({
        isactive: "true",
        isevaluationenable: "true",
        status: EvaluationStatus.DirectManagerReviewing,
      }),
      signal,
    });
    return toLookupOptions(raw, "name");
  },

  async getTypes(signal?: AbortSignal): Promise<EvaluationTypeOption[]> {
    const raw = await request<unknown[]>("/kpi-evaluation-types/get-all", {
      method: "POST",
      body: "{}",
      signal,
    });
    const list = unwrapApiData(raw as unknown[] | ApiResponse<unknown[]> | null);
    if (!Array.isArray(list)) return [];
    return list
      .map((item): EvaluationTypeOption | null => {
        if (!item || typeof item !== "object") return null;
        const rec = item as Record<string, unknown>;
        if (rec.id === undefined || rec.id === null) return null;
        const name = String(rec.name ?? "").trim();
        if (!name) return null;
        return {
          id: String(rec.id),
          name,
          periods: toLookupOptions(rec.listKPIEvaluationPeriodDto, "name"),
        };
      })
      .filter((item): item is EvaluationTypeOption => item !== null);
  },
};
