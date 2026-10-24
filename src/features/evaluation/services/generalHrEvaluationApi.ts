import type {
  GeneralHrEvaluationDto, GeneralHrEvaluationRequest, GeneralHrStatusChange,
  ApprovalHistoryEntry, EvaluationApprover, PagedResult,
} from "@/types/evaluation";
import { request } from "@/lib/api/request";

export const generalHrEvaluationApi = {
  async getPaged(body: GeneralHrEvaluationRequest, signal?: AbortSignal) {
    const response = await request<{ data: PagedResult<GeneralHrEvaluationDto> }>("/evaluation/paged", {
      method: "POST",
      body: JSON.stringify({ ...body, Filters: { ...body.Filters, ismatchall: "false" } }),
      signal,
    });
    return response.data;
  },
  getReviewers(signal?: AbortSignal) {
    return request<{ id: string; fullName: string; systemCode?: string }[]>("/employeeinfor/get-user-by-filter", { signal });
  },
  getApprovalHistory(id: number, signal?: AbortSignal) {
    return request<ApprovalHistoryEntry[]>("/evaluation/" + id + "/approval-history", { signal });
  },
  getApprovers(id: number, signal?: AbortSignal) {
    return request<EvaluationApprover[]>("/evaluation/" + id + "/steps", { signal });
  },
  getStatuses(templateId: number, signal?: AbortSignal) {
    return request<{ status: number }[]>("/evaluation/statuses?templateid=" + templateId, { signal });
  },
  changeStatus(body: GeneralHrStatusChange) {
    return request("/evaluation/change-status", { method: "POST", body: JSON.stringify(body) });
  },
  remove(id: number) {
    return request("/evaluation/" + id, { method: "DELETE" });
  },
};
