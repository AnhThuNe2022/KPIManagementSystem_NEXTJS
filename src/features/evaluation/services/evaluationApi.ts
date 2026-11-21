import { request } from "@/lib/http/request";
import { unwrapApiData, type ApiResponse, type PagedResult } from "@/server/api/types";
import type { EvaluationDto } from "../types";

export const evaluationApi = {
  /** Preserves exact legacy payload `{ page, pageSize, filters: { getMy: "123" } }`. */
  async getMyPaged(params: {
    page?: number;
    pageSize?: number;
    signal?: AbortSignal;
  }): Promise<PagedResult<EvaluationDto>> {
    const raw = await request<ApiResponse<PagedResult<EvaluationDto>> | PagedResult<EvaluationDto>>(
      "/evaluation/paged",
      {
        method: "POST",
        body: JSON.stringify({
          page: params.page ?? 1,
          pageSize: params.pageSize ?? 10,
          filters: { getMy: "123" },
        }),
        signal: params.signal,
      },
    );
    const unwrapped = unwrapApiData(raw);
    return {
      items: Array.isArray(unwrapped?.items) ? unwrapped.items : [],
      total: Number(unwrapped?.total ?? 0),
    };
  },
};
