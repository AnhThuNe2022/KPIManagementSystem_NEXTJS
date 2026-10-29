import writeExcelFile from "write-excel-file/browser";
import type { GeneralHrEvaluationDto } from "@/types/evaluation";
import { formatEvaluationDate, hrStatusLabel } from "./evaluationDisplay";

export function createGeneralHrWorkbook(items: GeneralHrEvaluationDto[]) {
  const headers = ["Mã HT", "Mã ĐV", "Tên NV", "Phòng Ban", "Kỳ", "Biểu mẫu", "QLTT đang duyệt", "Email", "Ngày nộp", "Trạng Thái"];
  const rows = [headers.map(value => ({ value, fontWeight: "bold" as const, backgroundColor: "#131F6B", textColor: "#FFFFFF" })),
    ...items.map(item => [item.systemCode ?? "", item.companyCode ?? "", item.name, item.departmentName ?? "", item.period ?? "", item.templateName ?? "", item.strDirectManager ?? "", item.email ?? "", formatEvaluationDate(item.submitDate ?? null, ""), hrStatusLabel(item.status)])];
  return writeExcelFile(rows, {
    sheet: "Đánh giá KPI", stickyRowsCount: 1,
    columns: [20, 20, 32, 32, 58, 58, 32, 40, 30, 30].map(width => ({ width })),
  }, { features: [{ files: { transform: { "xl/worksheets/sheet{id}.xml": {
    insert: () => `<autoFilter ref="A1:J${rows.length}"/>`,
  } } } }] }).toBlob();
}
