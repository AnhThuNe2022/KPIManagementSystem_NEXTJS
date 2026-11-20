import { downloadFile, request } from "@/lib/api/request";
import type { PagedResult } from "@/lib/api/types";
import type { SummaryDetail, SummaryDetailFilters, SummaryFilters, SummaryMode, SummaryRequest, SummaryRow } from "../types";

export type ReviewCustomUser = {
  Id: number;
  UserId: string;
  SystemCode: string;
  JobTitle: string;
  CompanyId: number | null;
  DepartmentId: number | null;
};

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
  approve(ids: number[], level: number, managers: ReviewCustomUser[]) {
    return request("/evaluation/review-action-many", {
      method: "POST",
      body: JSON.stringify({ Ids: ids, ReviewRequest: { Action: 1, Level: level, ListUserCustom: managers } }),
    });
  },
  reject(id: number, level: number, comment: string) {
    return request("/evaluation/review-action/" + id, {
      method: "POST",
      body: JSON.stringify({ Comment: comment, Action: 2, Level: level }),
    });
  },
  async detail(mode: SummaryMode, periodIds: number[], companyIds: string[], pageSize: number, signal?: AbortSignal): Promise<PagedResult<SummaryDetail>> {
    const body = {
      PageSize: pageSize,
      Filters: {
        listperiodtemplateid: [...new Set(periodIds)].join(";"),
        companyids: companyIds.join(";"),
        typeScreenRole: mode === "HrSummary" ? "HrSummary" : "Director",
        typeScreen: "Summary",
      },
    };
    const items = new Map<number, SummaryDetail>();
    let total = 0;
    for (let page = 1; page === 1 || items.size < total; page++) {
      const result = await request<PagedResult<SummaryDetail>>("/summary/detail", {
        method: "POST", body: JSON.stringify({ Page: page, ...body }), signal,
      });
      signal?.throwIfAborted();
      if (page === 1) total = result.total;
      const before = items.size;
      for (const row of result.items) items.set(row.evalId, row);
      if (result.total !== total || items.size > total || (items.size < total && items.size === before)) {
        throw new Error("Chưa lấy đủ hồ sơ tổng hợp. Vui lòng làm mới và xuất lại.");
      }
    }
    return { items: [...items.values()], total };
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
