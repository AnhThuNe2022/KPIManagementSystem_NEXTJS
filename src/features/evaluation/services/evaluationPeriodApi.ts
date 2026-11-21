import { normalizePeriodType } from "@/design-system/registries";
import { request } from "@/lib/http/request";
import { unwrapApiData, type ApiResponse, type PagedResult } from "@/server/api/types";
import type { EvaluationPeriodDto, EvaluationTemplateDto } from "../types";

export interface EvaluationPeriodDraft {
  id?: number;
  name: string;
  periodType: string;
  evaluationTypeId: number | null;
  year: number | null;
  month: number | null;
  quarter: number | null;
  startDate: string | null;
  endDate: string | null;
  statusPeriod: number;
  isActive: boolean;
  templateIds: number[];
}

function isExplicitTrue(val: unknown): boolean {
  const unwrapped = unwrapApiData(val as ApiResponse<unknown> | unknown);
  return unwrapped === true || unwrapped === "true";
}

function isExplicitFalse(val: unknown): boolean {
  const unwrapped = unwrapApiData(val as ApiResponse<unknown> | unknown);
  return unwrapped === false || unwrapped === "false";
}

export const evaluationPeriodApi = {
  async getPage(params: {
    page?: number;
    pageSize?: number;
    signal?: AbortSignal;
  }): Promise<PagedResult<EvaluationPeriodDto>> {
    const raw = await request<
      PagedResult<EvaluationPeriodDto> | ApiResponse<PagedResult<EvaluationPeriodDto>>
    >("/kpi-evaluation-periods/get-page", {
      method: "POST",
      body: JSON.stringify({
        Page: params.page ?? 1,
        PageSize: params.pageSize ?? 10,
        Filters: { sortBy: "IsActive", sortOrder: "desc" },
      }),
      signal: params.signal,
    });
    const unwrapped = unwrapApiData(raw);
    return {
      items: Array.isArray(unwrapped?.items) ? unwrapped.items : [],
      total: Number(unwrapped?.total ?? 0),
    };
  },

  async getById(id: number, signal?: AbortSignal): Promise<EvaluationPeriodDto | null> {
    const raw = await request<EvaluationPeriodDto | ApiResponse<EvaluationPeriodDto> | null>(
      `/kpi-evaluation-periods/get-by-id/${encodeURIComponent(String(id))}`,
      { signal },
    );
    return unwrapApiData(raw);
  },

  async getTemplates(signal?: AbortSignal): Promise<EvaluationTemplateDto[]> {
    const raw = await request<
      PagedResult<EvaluationTemplateDto> | ApiResponse<PagedResult<EvaluationTemplateDto>>
    >("/kpi-templates?isActive=true&sortBy=CreatedAt+desc&page=1&pageSize=100", { signal });
    const unwrapped = unwrapApiData(raw);
    return Array.isArray(unwrapped?.items) ? unwrapped.items : [];
  },

  async save(draft: EvaluationPeriodDraft): Promise<void> {
    const normalizedType = normalizePeriodType(draft.periodType);
    const periodPayload = {
      ...(draft.id ? { id: draft.id } : {}),
      name: draft.name.trim(),
      periodType: normalizedType,
      evaluationTypeId: draft.evaluationTypeId,
      year: draft.year,
      month: normalizedType === "Month" ? draft.month : null,
      quarter: normalizedType === "Quarter" ? draft.quarter : null,
      startDate: draft.startDate || null,
      endDate: draft.endDate || null,
      statusPeriod: draft.statusPeriod,
      isActive: draft.isActive,
    };

    if (draft.id && draft.id > 0) {
      const result = await request<unknown>("/kpi-evaluation-periods/update-period", {
        method: "POST",
        body: JSON.stringify({
          Period: periodPayload,
          ListTemplateId: draft.templateIds,
        }),
      });
      if (!isExplicitTrue(result)) {
        throw new Error("Cập nhật kỳ đánh giá không thành công.");
      }
      return;
    }

    await request("/kpi-evaluation-periods/create", {
      method: "POST",
      body: JSON.stringify({
        ...periodPayload,
        ListTemplateId: draft.templateIds,
      }),
    });
  },

  async remove(id: number): Promise<void> {
    const result = await request<unknown>(
      `/kpi-evaluation-periods/delete/${encodeURIComponent(String(id))}`,
      { method: "DELETE" },
    );
    if (isExplicitFalse(result)) {
      throw new Error("Không thể xóa kỳ đánh giá này.");
    }
  },
};
