import type { ReviewRole } from "@/features/auth/types";
import { request } from "@/lib/http/request";
import type { PagedResult } from "@/server/api/types";
import type { ReviewedEvaluationDto, ReviewedEvaluationFilters } from "../types";

export const reviewedEvaluationApi = {
  async get(params: {
    page?: number;
    pageSize?: number;
    rolePage: ReviewRole;
    filters: ReviewedEvaluationFilters;
    sortBy: string;
    signal?: AbortSignal;
  }): Promise<PagedResult<ReviewedEvaluationDto>> {
    const query = new URLSearchParams({
      page: String(params.page ?? 1),
      pageSize: String(params.pageSize ?? 20),
      rolePage: String(params.rolePage),
      sortBy: params.sortBy,
    });

    const entries: Array<[string, string]> = [
      ["keyword", params.filters.keyword],
      ["companyId", params.filters.companyId],
      ["departmentId", params.filters.departmentId],
      ["typeId", params.filters.typeId],
      ["periodId", params.filters.periodId],
      ["status", params.filters.status],
      ["from", params.filters.from],
      ["to", params.filters.to],
    ];
    for (const [key, val] of entries) {
      if (val.trim()) query.set(key, val.trim());
    }

    const data = await request<PagedResult<ReviewedEvaluationDto>>(
      `/evaluation/reviewed?${query.toString()}`,
      { signal: params.signal },
    );

    return {
      items: Array.isArray(data?.items) ? data.items : [],
      total: Number(data?.total ?? 0),
    };
  },
};
