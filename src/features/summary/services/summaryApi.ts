import { downloadFile, request } from "@/lib/api/request";
import type { PagedResult } from "@/lib/api/types";
import type { SummaryDetail, SummaryDetailFilters, SummaryFilters, SummaryMode, SummaryRequest, SummaryRow } from "../types";

export const summaryApi = {
  updateNote(row: SummaryDetail, note: string) {
    return request("/evaluation/" + row.evalId, {
      method: "PATCH", body: JSON.stringify({ ...row, note }),
    });
  },
  exportSummary(items: SummaryDetail[], signal?: AbortSignal) {
    return downloadFile("/export-file/summary-evaluations", {
      method: "POST", body: JSON.stringify(items), signal,
    }, "tong-hop-danh-gia.xlsx");
  },
  getDetails(mode: SummaryMode, periodId: number, page: number, pageSize: number, filters: SummaryDetailFilters, signal?: AbortSignal) {
    return request<PagedResult<SummaryDetail>>("/summary/detail", {
      method: "POST",
      body: JSON.stringify({
        Page: page,
        PageSize: pageSize,
        Filters: {
          periodId: String(periodId),
          status: filters.status,
          typeScreenRole: mode === "HrSummary" ? "HrSummary" : "Director",
          typeScreen: "Summary",
          keyword: filters.keyword.trim(),
          departmentId: filters.departmentId === "-1" ? "" : filters.departmentId,
          companyid: filters.companyId === "-1" || filters.companyId === "0" ? "" : filters.companyId,
        },
      }),
      signal,
    });
  },
  approve(ids: number[], level: number, managerIds: (string | number)[]) {
    return request("/evaluation/review-action-many", {
      method: "POST",
      body: JSON.stringify({ Ids: ids, ReviewRequest: { Action: 1, Level: level, ListUserCustom: managerIds } }),
    });
  },
  reject(id: number, level: number, comment: string) {
    return request("/evaluation/review-action/" + id, {
      method: "POST",
      body: JSON.stringify({ Comment: comment, Action: 2, Level: level }),
    });
  },
  detail(mode: SummaryMode, periodIds: number[], companyIds: string[], signal?: AbortSignal) {
    return request<PagedResult<SummaryDetail>>("/summary/detail", {
      method: "POST",
      body: JSON.stringify({
        Page: 1,
        PageSize: 0,
        Filters: {
          listperiodtemplateid: [...new Set(periodIds)].join(";"),
          typeScreenRole: mode === "HrSummary" ? "HrSummary" : "Director",
          typeScreen: "Summary",
          companyids: companyIds.join(";"),
        },
      }),
      signal,
    });
  },
  list(mode: SummaryMode, page: number, pageSize: number, filters: SummaryFilters, signal?: AbortSignal) {
    const body: SummaryRequest = {
      Page: page,
      PageSize: pageSize,
      Filters: {
        typeScreen: "Summary",
        typeScreenRole: mode === "HrSummary" ? "HrSummary" : "Director",
        companyids: filters.companyIds.join(";"),
        jobpositionid: filters.jobPositionId,
        kpievaluationtypeid: filters.typeId || null,
        periodid: filters.periodId || null,
      },
    };
    return request<PagedResult<SummaryRow>>("/summary/compile", {
      method: "POST",
      body: JSON.stringify(body),
      signal,
    });
  },
};
