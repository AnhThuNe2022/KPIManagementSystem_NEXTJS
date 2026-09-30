import type {
  ApiResponse,
  EvaluationDto,
  PagedRequest,
  PagedResult,
} from "@/types/evaluation";

export const evaluationApi = {
  async getPaged(
    request: PagedRequest
  ): Promise<ApiResponse<PagedResult<EvaluationDto>>> {
    const response = await fetch("/api/evaluation/paged", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message || "Không thể tải danh sách bản đánh giá."
      );
    }

    return data;
  },
};