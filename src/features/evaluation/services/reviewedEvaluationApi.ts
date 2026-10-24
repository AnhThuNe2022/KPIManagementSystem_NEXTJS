import type { PagedResult, ReviewedEvaluationDto, ReviewedEvaluationFilters, ReviewRole } from "@/types/evaluation";
import { request } from "@/lib/api/request";

type ReviewedQuery = {
  level: ReviewRole; page: number; pageSize: number;
  filters: ReviewedEvaluationFilters; signal?: AbortSignal;
};

export const reviewedEvaluationApi = {
  get({ level, page, pageSize, filters, signal }: ReviewedQuery) {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize), rolePage: String(level) });
    for (const [key, value] of Object.entries(filters)) {
      if (value.trim()) query.set(key, value.trim());
    }
    return request<PagedResult<ReviewedEvaluationDto>>("/evaluation/reviewed?" + query, { signal });
  },
};
