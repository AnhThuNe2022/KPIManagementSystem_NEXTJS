import { request } from "@/lib/api/request";
import type {
  BackgroundJobAttempt,
  BackgroundJobDetail,
  BackgroundJobFilter,
  BackgroundJobListResponse,
  BackgroundJobStatistics,
} from "../types";

export const backgroundJobsApi = {
  getStatistics(signal?: AbortSignal) {
    return request<BackgroundJobStatistics>("/backgroundjobs/statistics", { signal });
  },

  getList(filter: BackgroundJobFilter, signal?: AbortSignal) {
    const params = new URLSearchParams();
    params.set("Page", String(filter.page));
    params.set("PageSize", String(filter.pageSize));
    if (filter.status) params.set("Status", filter.status);
    if (filter.jobType) params.set("JobType", filter.jobType);
    if (filter.keyword?.trim()) params.set("Keyword", filter.keyword.trim());
    if (filter.fromDate) params.set("FromDate", filter.fromDate);
    if (filter.toDate) params.set("ToDate", filter.toDate);
    return request<BackgroundJobListResponse>(`/backgroundjobs?${params.toString()}`, { signal });
  },

  getDetail(id: number, signal?: AbortSignal) {
    return request<BackgroundJobDetail>(`/backgroundjobs/${id}`, { signal });
  },

  getAttempts(jobId: number, signal?: AbortSignal) {
    return request<BackgroundJobAttempt[]>(`/backgroundjobs/${jobId}/attempts`, { signal });
  },
};
