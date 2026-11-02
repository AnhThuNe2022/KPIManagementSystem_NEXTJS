import { request } from "@/lib/api/request";
import type { ApiResponse, PagedRequest, PagedResult } from "@/lib/api/types";
import type { EvaluationDto } from "@/features/evaluation/types";

export const evaluationApi = {
  getPaged(body: PagedRequest, signal?: AbortSignal) {
    return request<ApiResponse<PagedResult<EvaluationDto>>>("/evaluation/paged", {
      method: "POST",
      body: JSON.stringify(body),
      signal,
    });
  },
};
