import { zipSync } from "fflate";
import { createEvaluationExporter, type EvaluationExport } from "./evaluationExport";

const safeName = (value: string) => value.replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").trim();

export async function downloadEvaluationFile(records: EvaluationExport[], ids: number[], signal?: AbortSignal) {
  const receivedIds = new Set(records.map(record => record.evaluationDTO.id));
  if (records.length !== ids.length || ids.some(id => !receivedIds.has(id))) {
    throw new Error("API chưa trả đủ hồ sơ đã chọn. Vui lòng tải lại danh sách rồi xuất lại.");
  }
  const template = await fetch("/excel/excel_chi_tiet_template.xlsx", { signal });
  if (!template.ok) throw new Error("Không tải được mẫu Excel chi tiết. Vui lòng thử lại.");
  const createWorkbook = createEvaluationExporter(await template.arrayBuffer());
  const files: Record<string, Uint8Array> = {};
  for (const record of records) {
    await new Promise(resolve => setTimeout(resolve, 0));
    signal?.throwIfAborted();
    const data = record.evaluationDTO;
    const base = ("FormEvaluation_" + safeName(data.userFullName) + "_" + safeName(data.systemcodeEmployee || data.userId)).slice(0, 180);
    const name = files[base + ".xlsx"] ? base + "_" + data.id + ".xlsx" : base + ".xlsx";
    files[name] = createWorkbook(record);
  }
  const filename = records.length === 1 ? Object.keys(files)[0] : "ban-danh-gia-chi-tiet.zip";
  const bytes = records.length === 1 ? files[filename] : zipSync(files, { level: 0 });
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: records.length === 1
    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/zip" });
  signal?.throwIfAborted();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
