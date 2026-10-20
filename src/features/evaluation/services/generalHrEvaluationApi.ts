import {
  generalHrStatusOptions,
  UserRoleSystem,
  type GeneralHrEvaluationDto,
  type GeneralHrEvaluationRequest,
  type GeneralHrStatusChange,
  type ApprovalHistoryEntry,
  type EvaluationApprover,
  type PagedResult,
} from "@/types/evaluation";
import { request } from "./evaluationRequest";
import { evaluationLookupApi } from "./evaluationLookupApi";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalText(row: Record<string, unknown>, keys: string[]) {
  return keys.every((key) => row[key] == null || typeof row[key] === "string");
}

export const generalHrEvaluationApi = {
  async getPaged(body: GeneralHrEvaluationRequest, signal?: AbortSignal): Promise<PagedResult<GeneralHrEvaluationDto>> {
    const selected = [...new Set(body.Filters.status.split(";").map((value) => value.trim()).filter(Boolean))];
    if (selected.some((value) => !generalHrStatusOptions.some((option) => option.value === value))) {
      throw new Error("INVALID_GENERAL_HR_STATUS");
    }
    const response = await request("/evaluation/paged", {
      method: "POST",
      body: JSON.stringify({ ...body, Filters: { ...body.Filters, status: selected.join(";"), ismatchall: "false" } }),
      signal,
    });
    if (!record(response) || response.success !== true || !record(response.data)) {
      throw new Error("INVALID_GENERAL_HR_RESPONSE");
    }
    const { items, total } = response.data;
    if (!Number.isSafeInteger(total) || Number(total) < 0 || !Array.isArray(items) || items.some((row) =>
      !record(row) || !Number.isSafeInteger(row.id) || Number(row.id) < 1 ||
      typeof row.name !== "string" || typeof row.userId !== "string" || typeof row.status !== "string" ||
      (row.templateId != null && (!Number.isSafeInteger(row.templateId) || Number(row.templateId) < 1)) ||
      !optionalText(row, ["systemCode", "companyCode", "departmentName", "period", "templateName", "submitDate", "strDirectManager"])
    )) throw new Error("INVALID_GENERAL_HR_RESPONSE");
    return { items: items as GeneralHrEvaluationDto[], total: Number(total) };
  },

  getCompanies(signal?: AbortSignal) {
    return evaluationLookupApi.getCompanies(UserRoleSystem.HR, signal);
  },
  getDepartments(signal?: AbortSignal) {
    return evaluationLookupApi.getDepartments("", UserRoleSystem.HR, signal);
  },
  getTypes: evaluationLookupApi.getTypes,

  async getReviewerOptions(signal?: AbortSignal) {
    const data = await request("/employeeinfor/get-user-by-filter", { signal });
    if (!Array.isArray(data) || data.some((row) => !record(row) || typeof row.id !== "string" || typeof row.fullName !== "string" || !optionalText(row, ["systemCode"]))) {
      throw new Error("INVALID_REVIEWERS_RESPONSE");
    }
    return data.map((row) => ({ id: String(row.id), name: String(row.fullName), code: String(row.systemCode ?? "") }));
  },

  async getForExport(body: GeneralHrEvaluationRequest, total: number, signal?: AbortSignal, onProgress?: (loaded: number, total: number) => void): Promise<PagedResult<GeneralHrEvaluationDto>> {
    if (!Number.isSafeInteger(total) || total < 1) throw new Error("INVALID_EXPORT_TOTAL");
    const items: GeneralHrEvaluationDto[] = [], ids = new Set<number>();
    const pageSize = 100;
    let expectedTotal = total;
    for (let page = 1; page === 1 || items.length < expectedTotal; page++) {
      signal?.throwIfAborted();
      const result = await generalHrEvaluationApi.getPaged({ ...body, Page: page, PageSize: pageSize }, signal);
      signal?.throwIfAborted();
      if (page === 1) expectedTotal = result.total;
      if (result.total !== expectedTotal || result.items.length > pageSize || (!result.items.length && items.length < expectedTotal)) throw new Error("INCOMPLETE_EXPORT");
      for (const item of result.items) {
        if (ids.has(item.id)) throw new Error("INCOMPLETE_EXPORT");
        ids.add(item.id); items.push(item);
      }
      if (items.length > expectedTotal) throw new Error("INCOMPLETE_EXPORT");
      onProgress?.(items.length, expectedTotal);
    }
    return { items, total: expectedTotal };
  },

  async getApprovalHistory(id: number, signal?: AbortSignal): Promise<ApprovalHistoryEntry[]> {
    const data = await request(`/evaluation/${id}/approval-history`, { signal });
    if (!Array.isArray(data) || data.some((row) => !record(row) || !Number.isSafeInteger(row.approvalId) || typeof row.status !== "string" || typeof row.createdAt !== "string" || !optionalText(row, ["approverName", "approverUserId", "approvalLevel", "comment", "statusValue"]))) {
      throw new Error("INVALID_HISTORY_RESPONSE");
    }
    return data as ApprovalHistoryEntry[];
  },

  async getApprovers(id: number, signal?: AbortSignal): Promise<EvaluationApprover[]> {
    const data = await request(`/evaluation/${id}/steps`, { signal });
    if (!Array.isArray(data) || data.some((row) => !record(row) || !Number.isSafeInteger(row.id) || typeof row.userName !== "string" || typeof row.status !== "string" || typeof row.isApprove !== "boolean" || !optionalText(row, ["userId", "systemCode", "approvalDate", "message"]))) {
      throw new Error("INVALID_APPROVERS_RESPONSE");
    }
    return data as EvaluationApprover[];
  },

  async getAvailableStatuses(templateId: number, signal?: AbortSignal): Promise<number[]> {
    const query = new URLSearchParams({ templateid: String(templateId) });
    const data = await request(`/evaluation/statuses?${query}`, { signal });
    if (!Array.isArray(data) || data.some((row) => !record(row) || !Number.isSafeInteger(row.status) || Number(row.status) < 0 || Number(row.status) > 19)) {
      throw new Error("INVALID_STATUSES_RESPONSE");
    }
    return [...new Set(data.map((row) => Number(row.status)))].filter((status) => status !== 1 && status !== 9);
  },

  async changeStatus(body: GeneralHrStatusChange) {
    const result = await request("/evaluation/change-status", {
      method: "POST", body: JSON.stringify({ EvalId: body.EvalId, Status: body.Status, Reason: body.Reason ?? "" }),
    });
    if (record(result) && result.success === false) throw new Error("CHANGE_STATUS_FAILED");
    return result;
  },

  async remove(id: number) {
    const result = await request(`/evaluation/${id}`, { method: "DELETE" });
    if (record(result) && result.success === false) throw new Error("DELETE_EVALUATION_FAILED");
    return result;
  },
};
