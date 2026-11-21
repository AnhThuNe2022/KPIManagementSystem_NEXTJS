import { exportEvaluationsApi } from "@/features/evaluation/services/exportEvaluations";
import { request } from "@/lib/http/request";
import type { PagedResult } from "@/server/api/types";
import type {
  ReviewCustomUser,
  SummaryDetail,
  SummaryDetailFilters,
  SummaryFilters,
  SummaryMode,
  SummaryRow,
} from "../types";

export const summaryApi = {
  async list(
    mode: SummaryMode,
    page: number,
    pageSize: number,
    filters: SummaryFilters,
    signal?: AbortSignal,
  ): Promise<PagedResult<SummaryRow>> {
    const res = await request<PagedResult<SummaryRow>>("/summary/compile", {
      method: "POST",
      body: JSON.stringify({
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
      }),
      signal,
    });
    return {
      items: Array.isArray(res?.items) ? res.items : [],
      total: Number(res?.total ?? 0),
    };
  },

  async getDetails(
    mode: SummaryMode,
    periodId: number,
    page: number,
    pageSize: number,
    filters: SummaryDetailFilters,
    signal?: AbortSignal,
  ): Promise<PagedResult<SummaryDetail>> {
    const res = await request<PagedResult<SummaryDetail>>("/summary/detail", {
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
          companyid:
            filters.companyId === "-1" || filters.companyId === "0" ? "" : filters.companyId,
        },
      }),
      signal,
    });
    return {
      items: Array.isArray(res?.items) ? res.items : [],
      total: Number(res?.total ?? 0),
    };
  },

  async collectAllDetailsForExport(
    mode: SummaryMode,
    periodIds: number[],
    companyIds: string[],
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<PagedResult<SummaryDetail>> {
    const body = {
      PageSize: pageSize,
      Filters: {
        listperiodtemplateid: Array.from(new Set(periodIds)).join(";"),
        companyids: companyIds.join(";"),
        typeScreenRole: mode === "HrSummary" ? "HrSummary" : "Director",
        typeScreen: "Summary",
      },
    };
    const items = new Map<number, SummaryDetail>();
    let total = 0;

    for (let page = 1; page === 1 || items.size < total; page += 1) {
      const result = await request<PagedResult<SummaryDetail>>("/summary/detail", {
        method: "POST",
        body: JSON.stringify({ Page: page, ...body }),
        signal,
      });
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      if (page === 1) total = Number(result?.total ?? 0);
      const before = items.size;
      for (const row of result?.items ?? []) {
        items.set(row.evalId, row);
      }
      if (
        Number(result?.total ?? 0) !== total ||
        items.size > total ||
        (items.size < total && items.size === before)
      ) {
        throw new Error("Chưa lấy đủ hồ sơ tổng hợp. Vui lòng làm mới và xuất lại.");
      }
    }

    return { items: Array.from(items.values()), total };
  },

  async updateNote(row: SummaryDetail, note: string): Promise<void> {
    await request(`/evaluation/${row.evalId}`, {
      method: "PATCH",
      body: JSON.stringify({ ...row, note }),
    });
  },

  async approve(ids: number[], level: number, managers: ReviewCustomUser[]): Promise<void> {
    await request("/evaluation/review-action-many", {
      method: "POST",
      body: JSON.stringify({
        Ids: ids,
        ReviewRequest: { Action: 1, Level: level, ListUserCustom: managers },
      }),
    });
  },

  async reject(id: number, level: number, comment: string): Promise<void> {
    await request(`/evaluation/review-action/${id}`, {
      method: "POST",
      body: JSON.stringify({ Comment: comment, Action: 2, Level: level }),
    });
  },

  exportSummaryExcel(items: SummaryDetail[], signal?: AbortSignal): Promise<string> {
    return exportEvaluationsApi.downloadSummaryExcel(items, signal);
  },

  exportDetailedZip(ids: number[], signal?: AbortSignal): Promise<string> {
    return exportEvaluationsApi.downloadDetailedZip(ids, signal);
  },
};
