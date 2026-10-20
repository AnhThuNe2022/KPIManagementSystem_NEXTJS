import {
  generalHrStatusOptions,
  type GeneralHrEvaluationRequest,
  type GeneralHrStatusChange,
} from "@/types/evaluation";
import { request } from "./evaluationRequest";

export const generalHrEvaluationApi = {
  getPaged(body: GeneralHrEvaluationRequest, signal?: AbortSignal) {
    const selected = [
      ...new Set(
        body.Filters.status
          .split(";")
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];
    if (
      selected.some((value) => !generalHrStatusOptions.some((option) => option.value === value))
    ) {
      throw new Error("INVALID_GENERAL_HR_STATUS");
    }
    return request("/evaluation/paged", {
      method: "POST",
      body: JSON.stringify({
        ...body,
        Filters: {
          ...body.Filters,
          status: selected.join(";"),
          ismatchall: String(
            generalHrStatusOptions.every((option) => selected.includes(option.value)),
          ),
        },
      }),
      signal,
    });
  },

  getCompanies(signal?: AbortSignal) {
    return request("/company/by-manager", {
      method: "POST",
      body: JSON.stringify({ byunithrcompile: "1" }),
      signal,
    });
  },

  getDepartments(signal?: AbortSignal) {
    return request("/department/get-all-department?byscope=true", { signal });
  },

  getTypes(signal?: AbortSignal) {
    return request("/kpi-evaluation-types/get-all", { method: "POST", body: "{}", signal });
  },

  getReviewerOptions(signal?: AbortSignal) {
    return request("/employeeinfor/get-user-by-filter", { signal });
  },

  getForExport(body: GeneralHrEvaluationRequest, total: number, signal?: AbortSignal) {
    if (!Number.isSafeInteger(total) || total < 1) {
      throw new Error("INVALID_EXPORT_TOTAL");
    }
    return generalHrEvaluationApi.getPaged({ ...body, Page: 1, PageSize: total }, signal);
  },

  getApprovalHistory(id: number, signal?: AbortSignal) {
    return request(`/evaluation/${id}/approval-history`, { signal });
  },

  getApprovers(id: number, signal?: AbortSignal) {
    return request(`/evaluation/${id}/steps`, { signal });
  },

  getAvailableStatuses(templateId: number, signal?: AbortSignal) {
    const query = new URLSearchParams({ templateid: String(templateId) });
    return request(`/evaluation/statuses?${query}`, { signal });
  },

  changeStatus(body: GeneralHrStatusChange) {
    return request("/evaluation/change-status", {
      method: "POST",
      body: JSON.stringify({ EvalId: body.EvalId, Status: body.Status, Reason: body.Reason ?? "" }),
    });
  },

  remove(id: number) {
    return request(`/evaluation/${id}`, { method: "DELETE" });
  },
};
