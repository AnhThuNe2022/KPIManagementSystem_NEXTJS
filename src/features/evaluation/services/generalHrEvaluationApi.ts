import { GENERAL_HR_FILTER_STATUS_KEYS } from "@/design-system/registries";
import { request } from "@/lib/http/request";
import { unwrapApiData, type ApiResponse, type PagedResult } from "@/server/api/types";
import type {
  ApprovalHistoryEntry,
  EvaluationApprover,
  GeneralHrEvaluationDto,
  GeneralHrFilters,
  TemplateStatusOption,
} from "../types";

export interface ReviewerOption {
  id: string;
  fullName: string;
  systemCode: string | null;
}

export const generalHrEvaluationApi = {
  async getPaged(params: {
    page?: number;
    pageSize?: number;
    filters: GeneralHrFilters;
    signal?: AbortSignal;
  }): Promise<PagedResult<GeneralHrEvaluationDto>> {
    const { filters } = params;
    const isMatchAll =
      filters.statuses.length === 0 ||
      filters.statuses.length >= GENERAL_HR_FILTER_STATUS_KEYS.length;

    const payload = {
      Page: params.page ?? 1,
      PageSize: params.pageSize ?? 10,
      Filters: {
        keyword: filters.keyword.trim() || undefined,
        companyid: filters.companyId.trim() || undefined,
        departmentid: filters.departmentId.trim() || undefined,
        userapprove: filters.reviewerId.trim() || undefined,
        evaluationtypeid: filters.typeId.trim() || undefined,
        periodid: filters.periodId.trim() || undefined,
        status: isMatchAll ? "" : filters.statuses.join(";"),
        ismatchall: isMatchAll ? "true" : "false",
        sortBy: "Id",
        sortOrder: filters.sortOrder,
      },
    };

    const raw = await request<
      ApiResponse<PagedResult<GeneralHrEvaluationDto>> | PagedResult<GeneralHrEvaluationDto>
    >("/evaluation/paged", {
      method: "POST",
      body: JSON.stringify(payload),
      signal: params.signal,
    });
    const unwrapped = unwrapApiData(raw);
    return {
      items: Array.isArray(unwrapped?.items) ? unwrapped.items : [],
      total: Number(unwrapped?.total ?? 0),
    };
  },

  async getReviewers(signal?: AbortSignal): Promise<ReviewerOption[]> {
    const raw = await request<
      Array<{ id: string; fullName?: string | null; systemCode?: string | null }> |
      ApiResponse<Array<{ id: string; fullName?: string | null; systemCode?: string | null }>>
    >("/employeeinfor/get-user-by-filter?Filters[userapprove]=1", { signal });
    const unwrapped = unwrapApiData(raw);
    if (!Array.isArray(unwrapped)) return [];
    return unwrapped.map((item) => ({
      id: String(item.id),
      fullName: item.fullName?.trim() || String(item.id),
      systemCode: item.systemCode ?? null,
    }));
  },

  async getApprovalHistory(id: number, signal?: AbortSignal): Promise<ApprovalHistoryEntry[]> {
    const raw = await request<ApprovalHistoryEntry[] | ApiResponse<ApprovalHistoryEntry[]>>(
      `/evaluation/${id}/approval-history`,
      { signal },
    );
    const unwrapped = unwrapApiData(raw);
    return Array.isArray(unwrapped) ? unwrapped : [];
  },

  async getApprovers(id: number, signal?: AbortSignal): Promise<EvaluationApprover[]> {
    const raw = await request<EvaluationApprover[] | ApiResponse<EvaluationApprover[]>>(
      `/evaluation/${id}/steps`,
      { signal },
    );
    const unwrapped = unwrapApiData(raw);
    return Array.isArray(unwrapped) ? unwrapped : [];
  },

  async getStatuses(templateId: number, signal?: AbortSignal): Promise<TemplateStatusOption[]> {
    const raw = await request<TemplateStatusOption[] | ApiResponse<TemplateStatusOption[]>>(
      `/evaluation/statuses?templateid=${encodeURIComponent(String(templateId))}`,
      { signal },
    );
    const unwrapped = unwrapApiData(raw);
    return Array.isArray(unwrapped) ? unwrapped : [];
  },

  async changeStatus(params: { evalId: number; status: number; reason: string }): Promise<void> {
    await request("/evaluation/change-status", {
      method: "POST",
      body: JSON.stringify({
        EvalId: params.evalId,
        Status: params.status,
        Reason: params.reason.trim(),
      }),
    });
  },

  async remove(id: number): Promise<void> {
    await request(`/evaluation/${id}`, { method: "DELETE" });
  },
};
