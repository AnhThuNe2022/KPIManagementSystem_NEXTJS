import type { ReviewRole } from "@/features/auth/types";
import { request } from "@/lib/http/request";
import type { PagedResult } from "@/server/api/types";
import type { PendingEvaluationDto, PendingEvaluationFilters } from "../types";

export const pendingEvaluationApi = {
  async get(params: {
    page?: number;
    pageSize?: number;
    level: ReviewRole;
    filters: PendingEvaluationFilters;
    sortBy: string;
    signal?: AbortSignal;
  }): Promise<PagedResult<PendingEvaluationDto>> {
    const query = new URLSearchParams({
      page: String(params.page ?? 1),
      pageSize: String(params.pageSize ?? 20),
      level: String(params.level),
      sortBy: params.sortBy,
    });

    if (params.filters.keyword.trim()) query.set("keyword", params.filters.keyword.trim());
    if (params.filters.companyId.trim()) query.set("companyId", params.filters.companyId.trim());
    if (params.filters.departmentId.trim()) query.set("departmentId", params.filters.departmentId.trim());
    if (params.filters.periodId.trim()) query.set("periodId", params.filters.periodId.trim());

    const data = await request<PagedResult<PendingEvaluationDto>>(
      `/evaluation/pending?${query.toString()}`,
      { signal: params.signal },
    );

    return {
      items: Array.isArray(data?.items) ? data.items : [],
      total: Number(data?.total ?? 0),
    };
  },

  async rejectOne(params: {
    id: number;
    stepId: number;
    level: ReviewRole;
    comment: string;
  }): Promise<void> {
    await request(`/evaluation/review-action/${params.id}`, {
      method: "POST",
      body: JSON.stringify({
        Action: 2,
        Level: params.level,
        Comment: params.comment.trim(),
        StepId: params.stepId,
      }),
    });
  },
};
