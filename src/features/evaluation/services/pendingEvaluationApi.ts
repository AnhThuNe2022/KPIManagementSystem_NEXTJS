import type { PagedResult, PendingEvaluationDto, PendingEvaluationFilters, ReviewRole } from "@/types/evaluation";
import { request } from "@/lib/api/request";

type PendingQuery = {
  page?: number; pageSize?: number; level: ReviewRole;
  filters: PendingEvaluationFilters; sortBy: string; signal?: AbortSignal;
};
type ReviewAction = { Action: number; Level: ReviewRole; Comment: string; StepId: number };

export const pendingEvaluationApi = {
  reviewAction(id: number, body: ReviewAction) {
    return request("/evaluation/review-action/" + id, { method: "POST", body: JSON.stringify(body) });
  },
  get({ page = 1, pageSize = 20, level, filters, sortBy, signal }: PendingQuery) {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize), level: String(level), sortBy });
    for (const [key, value] of Object.entries(filters)) {
      if (value.trim()) query.set(key, value.trim());
    }
    return request<PagedResult<PendingEvaluationDto>>("/evaluation/pending?" + query, { signal });
  },
};
