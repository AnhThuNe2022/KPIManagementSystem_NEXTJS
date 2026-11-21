import { downloadFile } from "@/lib/http/request";

export const exportEvaluationsApi = {
  async downloadDetailedZip(ids: number[], signal?: AbortSignal): Promise<string> {
    const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isSafeInteger(id) && id > 0)));
    if (uniqueIds.length === 0) {
      throw new Error("Vui lòng chọn ít nhất một hồ sơ để xuất.");
    }
    return downloadFile("/export-file/evaluations", "ban-danh-gia.zip", {
      method: "POST",
      body: JSON.stringify(uniqueIds),
      signal,
    });
  },

  async downloadListExcel(rows: unknown[], signal?: AbortSignal): Promise<string> {
    return downloadFile("/export-file/list-evaluations", "danh-sach-danh-gia.xlsx", {
      method: "POST",
      body: JSON.stringify(rows),
      signal,
    });
  },

  async downloadSummaryExcel(rows: unknown[], signal?: AbortSignal): Promise<string> {
    return downloadFile("/export-file/summary-evaluations", "tong-hop-danh-gia.xlsx", {
      method: "POST",
      body: JSON.stringify(rows),
      signal,
    });
  },
};
