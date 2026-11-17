import { downloadFile } from "@/lib/api/request";

export async function exportEvaluations(ids: number[], signal?: AbortSignal) {
  return downloadFile("/export-file/evaluations", {
    method: "POST", body: JSON.stringify([...new Set(ids)]), signal,
  }, "ban-danh-gia.zip");
}
