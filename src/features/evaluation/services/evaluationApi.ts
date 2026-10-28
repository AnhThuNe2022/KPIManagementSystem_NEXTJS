import { request } from "@/lib/api/request";
import type { ApiResponse, EvaluationDto, PagedRequest, PagedResult } from "@/types/evaluation";

export const evaluationApi = {
  getPaged(body: PagedRequest, signal?: AbortSignal) {
    return request<ApiResponse<PagedResult<EvaluationDto>>>("/evaluation/paged", {
      method: "POST",
      body: JSON.stringify(body),
      signal,
    });
  },
};
