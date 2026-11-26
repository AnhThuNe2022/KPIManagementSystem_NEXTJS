import { EvaluationStatus } from "@/design-system/registries";
import { UserRoleSystem, type ReviewRole } from "@/features/auth/types";
import { companyApi } from "@/features/company/services/companyApi";
import { departmentApi } from "@/features/department/services/departmentApi";
import { request } from "@/lib/http/request";
import { unwrapApiData, type ApiResponse } from "@/server/api/types";
import type {
  EvaluationPeriodLookupOption,
  EvaluationTypeOption,
  LookupOption,
  TemplatePeriodLookupDto,
} from "../types";

function mapNamedRows<T extends LookupOption = LookupOption>(
  raw: unknown,
  labelKey = "name",
  extend?: (rec: Record<string, unknown>, base: LookupOption) => T,
): T[] {
  const list = unwrapApiData(raw as unknown[] | ApiResponse<unknown[]> | null);
  if (!Array.isArray(list)) return [];
  const options: T[] = [];
  for (const row of list) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = rec.id;
    if (id === undefined || id === null) continue;
    const label = rec[labelKey];
    const name = typeof label === "string" ? label.trim() : String(label ?? "").trim();
    if (!name) continue;
    const base: LookupOption = { id: String(id), name };
    options.push(extend ? extend(rec, base) : (base as T));
  }
  return options;
}

function toTemplatePeriodDtos(raw: unknown): TemplatePeriodLookupDto[] {
  if (!Array.isArray(raw)) return [];
  const items: TemplatePeriodLookupDto[] = [];
  for (const tp of raw) {
    if (!tp || typeof tp !== "object") continue;
    const rec = tp as Record<string, unknown>;
    const templateId = Number(rec.templateId);
    if (!Number.isFinite(templateId)) continue;
    items.push({
      id: typeof rec.id === "number" ? rec.id : undefined,
      templateId,
      isActive: typeof rec.isActive === "boolean" ? rec.isActive : rec.isActive === null ? null : undefined,
      name: typeof rec.name === "string" ? rec.name : typeof rec.templateName === "string" ? rec.templateName : null,
    });
  }
  return items;
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
    return mapNamedRows(raw);
  },

  async getTypes(signal?: AbortSignal): Promise<EvaluationTypeOption[]> {
    const raw = await request<unknown[]>("/kpi-evaluation-types/get-all", {
      method: "POST",
      body: "{}",
      signal,
    });
    return mapNamedRows<EvaluationTypeOption>(raw, "name", (rec, base) => ({
      ...base,
      periods: mapNamedRows<EvaluationPeriodLookupOption>(
        rec.listKPIEvaluationPeriodDto,
        "name",
        (pRec, pBase) => ({
          ...pBase,
          templatePeriodDtos: toTemplatePeriodDtos(pRec.templatePeriodDtos),
        }),
      ),
    }));
  },
};
