import { request } from "@/lib/api/request";
import type { ApiResponse, PagedResult } from "@/lib/api/types";

export type EvaluationPeriod = {
  id: number | null;
  periodType: number | string | null;
  name: string | null;
  year: number | null;
  month: number | null;
  quarter: number | null;
  isActive: boolean | null;
  startDate: string | null;
  endDate: string | null;
  evaluationTypeId?: number | null;
  templateId?: number | null;
  listTemplateId?: number[] | null;
  templatePeriodDtos?: { templateId: number; templateName: string | null }[] | null;
  statusPeriod?: number | string;
  createdById?: number | null;
  createdAt?: string | null;
};

export type PeriodTone = "neutral" | "sky" | "violet" | "brand" | "crimson";

type Template = { id: number; templateCode: string | null; templateName: string | null };

const PERIOD_ENUM_NAMES = ["None", "Month", "Year", "Quarter", "HaftYear", "Unknown"] as const;

export const PERIOD_TYPE_OPTIONS = [
  { id: "None", name: "Không định kỳ" },
  { id: "Month", name: "Tháng" },
  { id: "Quarter", name: "Quý" },
  { id: "HaftYear", name: "Nửa năm" },
  { id: "Year", name: "Năm" },
  { id: "Unknown", name: "Không xác định" },
] as const;

const periodTypeMetaMap: Record<string, { label: string; tone: PeriodTone }> = {
  None: { label: "Không định kỳ", tone: "neutral" },
  Month: { label: "Tháng", tone: "sky" },
  Quarter: { label: "Quý", tone: "violet" },
  HaftYear: { label: "Nửa năm", tone: "brand" },
  Year: { label: "Năm", tone: "crimson" },
  Unknown: { label: "Không xác định", tone: "neutral" },
};

export const periodToneBadgeClasses: Record<PeriodTone, string> = {
  neutral:
    "border-slate-400/25 bg-slate-500/10 text-slate-600 [.dark_&]:text-slate-300",
  sky:
    "border-sky-500/30 bg-sky-500/12 text-sky-700 [.dark_&]:text-sky-300",
  violet:
    "border-violet-500/30 bg-violet-500/12 text-violet-700 [.dark_&]:text-violet-300",
  brand:
    "border-[rgb(var(--color-brand)/0.3)] bg-[rgb(var(--color-brand)/0.12)] text-[rgb(var(--color-brand))]",
  crimson:
    "border-[rgb(var(--color-accent)/0.3)] bg-[rgb(var(--color-accent)/0.12)] text-[rgb(var(--color-accent))]",
};

export const periodToneAccentClasses: Record<PeriodTone, string> = {
  neutral: "bg-slate-400/60",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  brand: "bg-[rgb(var(--color-brand))]",
  crimson: "bg-[rgb(var(--color-accent))]",
};

export function getPeriodTypeMeta(raw: number | string | null | undefined) {
  const key = normalizePeriodType(raw);
  if (!key) return null;
  return periodTypeMetaMap[key] ?? { label: key, tone: "neutral" as const };
}

export function normalizePeriodType(raw: number | string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return PERIOD_ENUM_NAMES[Number(trimmed)] ?? trimmed;
  if (trimmed === "Unknow") return "Unknown";
  return trimmed === "HalfYear" ? "HaftYear" : trimmed;
}

export function getPeriodTypeCode(raw: EvaluationPeriod["periodType"]): number | null {
  const name = normalizePeriodType(raw);
  const code = PERIOD_ENUM_NAMES.findIndex((item) => item === name);
  return code === -1 ? null : code;
}

export const evaluationPeriodApi = {
  async getPage(page: number, pageSize: number, signal?: AbortSignal) {
    const response = await request<PagedResult<EvaluationPeriod> | ApiResponse<PagedResult<EvaluationPeriod>>>(
      "/kpi-evaluation-periods/get-page",
      {
        method: "POST",
        body: JSON.stringify({
          Page: page,
          PageSize: pageSize,
          Filters: { sortBy: "IsActive", sortOrder: "desc" },
        }),
        signal,
      },
    );
    const data = "items" in response ? response : response.data;
    if (!data) throw new Error("MISSING_PERIOD_LIST");
    return data;
  },

  async getTemplates(signal?: AbortSignal) {
    const query = new URLSearchParams({ isActive: "true", sortBy: "CreatedAt desc", page: "1", pageSize: "100" });
    const result = await request<PagedResult<Template> | ApiResponse<PagedResult<Template>>>("/kpi-templates?" + query, { signal });
    const data = "items" in result ? result : result.data;
    if (!data) throw new Error("MISSING_TEMPLATES");
    return data.items;
  },

  async getById(id: number, signal?: AbortSignal) {
    const result = await request<EvaluationPeriod | ApiResponse<EvaluationPeriod> | null>(
      `/kpi-evaluation-periods/get-by-id/${encodeURIComponent(String(id))}`,
      { signal },
    );
    const data = result && typeof result === "object" && "data" in result ? result.data : result;
    if (!data || typeof data !== "object" || !("id" in data) || data.id == null) {
      throw new Error("MISSING_PERIOD_DETAIL");
    }
    return data;
  },

  async save(period: Omit<EvaluationPeriod, "listTemplateId"> & { periodType: string; statusPeriod: number }, templateIds: number[]) {
    if (period.id == null) {
      await request("/kpi-evaluation-periods/create", {
        method: "POST",
        body: JSON.stringify({ ...period, ListTemplateId: templateIds }),
      });
      return;
    }

    const updated = await request<boolean | string | ApiResponse<boolean | string> | null>("/kpi-evaluation-periods/update-period", {
      method: "POST",
      body: JSON.stringify({ Period: period, ListTemplateId: templateIds }),
    });
    const value = updated !== null && typeof updated === "object" ? updated.data : updated;
    const confirmed = typeof value === "string" ? value.trim() : value;
    if (confirmed === false || confirmed === "false") throw new Error("PERIOD_UPDATE_REJECTED");
    if (confirmed !== true && confirmed !== "true") throw new Error("PERIOD_UPDATE_UNCONFIRMED");
  },

  async remove(id: number) {
    const deleted = await request<boolean | string | ApiResponse<boolean | string> | null>(
      `/kpi-evaluation-periods/delete/${encodeURIComponent(String(id))}`,
      { method: "DELETE" },
    );
    const value = deleted !== null && typeof deleted === "object" ? deleted.data : deleted;
    const confirmed = typeof value === "string" ? value.trim() : value;
    if (confirmed === false || confirmed === "false") throw new Error("PERIOD_DELETE_REJECTED");
  },
};
