import { request } from "@/lib/api/request";
import type { PagedResult } from "@/lib/api/types";
import type { SummaryDetail, SummaryFilters, SummaryMode, SummaryRequest, SummaryRow } from "../types";

export const summaryApi = {
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
