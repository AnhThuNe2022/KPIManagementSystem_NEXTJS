import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { sanitizeTextContent } from "write-excel-file/utility";

export type EvaluationExport = {
  evaluationDTO: {
    id: number;
    userId: string;
    userFullName: string;
    systemcodeEmployee: string | null;
    jobPositionName: string | null;
    companyCode: string | null;
    managerDirect: string | null;
    jobDirectManager: string | null;
    startDateEval: string | null;
    endDateEval: string | null;
    periodName: string;
    kpiTemplateCode: string;
    totalScore: number | null;
    managerWeightedScore: number | null;
    band: string | null;
    extraData: Record<string, string | number | boolean | null> | null;
    items: {
      kpiGroupId: number;
      kpiGroupName: string;
      kpiIndicatorName: string;
      weight: number;
      actualValue: number | null;
      managerActualValue: number | null;
    }[];
  };
};

// The reference form wraps each paragraph at 149 characters, keeping whole words.
function textLines(value: string | number | boolean | null | undefined) {
  const lines: string[] = [];
  for (const paragraph of String(value ?? "").split(/\r?\n/).filter(line => line.trim())) {
    let rest = paragraph.trim();
    while (rest.length > 149) {
      const space = rest.lastIndexOf(" ", 149);
      const end = space > 0 ? space : 149;
      lines.push(rest.slice(0, end));
      rest = rest.slice(end).trimStart();
    }
    lines.push(rest);
  }
  return lines.length ? lines : [""];
}

export function createEvaluationExporter(template: ArrayBuffer) {
  const files = unzipSync(new Uint8Array(template));
  const sourceSheet = strFromU8(files["xl/worksheets/sheet1.xml"]);
  const sourceWorkbook = strFromU8(files["xl/workbook.xml"]);
  const sourceRows = new Map<number, string>();
  for (const match of sourceSheet.matchAll(/<x:row\b[^>]*\br="(\d+)"[^>]*>[\s\S]*?<\/x:row>/g)) {
    sourceRows.set(Number(match[1]), match[0]);
  }
  if (!sourceRows.has(131)) throw new Error("Mẫu Excel chi tiết không hợp lệ. Vui lòng tải lại trang.");

  const blocks = new Map<number, { end: number; key: string }>([
    [17, { end: 17, key: "proposed_salary_amount" }],
    [20, { end: 20, key: "appointed_position" }],
    [23, { end: 23, key: "innovation_summary" }],
    [26, { end: 26, key: "workload_increase_details" }],
    [29, { end: 29, key: "other_reason_details" }],
    [34, { end: 50, key: "self_achievements" }],
    [52, { end: 59, key: "self_unfinished" }],
    [61, { end: 70, key: "self_next_plan" }],
    [72, { end: 72, key: "self_initiatives" }],
    [75, { end: 75, key: "violations_details" }],
    [77, { end: 77, key: "violations_causes" }],
    [79, { end: 79, key: "violations_consequences" }],
    [81, { end: 81, key: "violations_solutions" }],
    [83, { end: 83, key: "violations_discipline" }],
    [85, { end: 85, key: "self_other" }],
    [88, { end: 91, key: "mgr_attitude" }],
    [93, { end: 95, key: "mgr_result" }],
    [97, { end: 97, key: "mgr_discipline" }],
    [116, { end: 117, key: "hr_comment" }],
  ]);
  const checkboxRows = new Map<number, string[]>([
    [11, ["after_probation_sign_contract", "after_probation_not_sign_contract"]],
    [12, ["renew_contract_sign", "renew_contract_not_sign"]],
    [13, ["promotion_agree", "promotion_disagree"]],
    [14, ["dismissal_agree", "dismissal_disagree"]],
    [18, ["appointed"]], [21, ["innovation_rewarded"]], [24, ["workload_increased"]],
    [27, ["other_reason"]], [30, ["performance_bonus_result"]],
    [31, ["contract_termination_agree", "contract_termination_disagree"]],
  ]);
  return (record: EvaluationExport) => {
    const data = record.evaluationDTO;
    const extra = data.extraData ?? {};
    let sheet = sourceSheet;
    const formatDate = (date: string | null) => date ? date.split("T")[0].split("-").reverse().join("/") : "";
    const today = new Date();
    const day = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][today.getDay()];
    const values: Record<string, string | number | null> = {
      D2: data.periodName,
      I2: "Biểu mẫu: " + data.kpiTemplateCode,
      C6: "- Họ và tên: " + (data.userFullName ?? ""),
      F6: "- Mã NV:  " + (data.systemcodeEmployee ?? ""),
      C7: "- Chức vụ: " + (data.jobPositionName ?? ""),
      F7: "- Đơn vị:  " + (data.companyCode ?? ""),
      C8: "- Quản lý trực tiếp: " + (data.managerDirect ?? ""),
      F8: "- Chức vụ:  " + (data.jobDirectManager ?? ""),
      C9: "- Thời gian đánh giá từ ngày: " + formatDate(data.startDateEval) + " đến ngày " + formatDate(data.endDateEval),
      I113: data.totalScore,
      J113: data.managerWeightedScore,
      H113: Math.round(data.items.reduce((sum, item) => sum + item.weight, 0) * 100) / 100 + "%",
      C121: data.managerWeightedScore,
      G121: data.band,
      E122: day + ",ngày " + today.getDate() + " tháng " + (today.getMonth() + 1) + " năm " + today.getFullYear(),
    };

    const output: string[] = [];
    const merges: string[] = [];
    const rowMap = new Map<number, number>();
    let nextRow = 2;

    function row(source: number, replacements: Record<string, string | number | null> = {}) {
      const number = nextRow++;
      let xml = sourceRows.get(source)!;
      xml = xml.replace(/<x:c\b[^>]*?(?:\/>|>[\s\S]*?<\/x:c>)/g, cell => {
        const address = cell.match(/\br="([A-Z]+)\d+"/)![1];
        const key = address + source;
        const value = address in replacements ? replacements[address] : values[key];
        if (value === undefined) return cell.replace(/\br="[A-Z]+\d+"/, 'r="' + address + number + '"');
        const opening = cell.slice(0, cell.indexOf(">"))
          .replace(/\/$/, "").replace(/\s+t="[^"]*"/, "")
          .replace(/\br="[A-Z]+\d+"/, 'r="' + address + number + '"');
        if (value === null || value === "") return opening + "/>";
        if (typeof value === "number") {
          if (!Number.isFinite(value)) throw new Error("Dữ liệu điểm đánh giá không hợp lệ.");
          return opening + "><x:v>" + value + "</x:v></x:c>";
        }
        return opening + ' t="inlineStr"><x:is><x:t xml:space="preserve">'
          + sanitizeTextContent(value) + "</x:t></x:is></x:c>";
      });
      xml = xml.replace(/(<x:row\b[^>]*\br=")\d+"/, (_, opening: string) => opening + number + '"');
      const checks = checkboxRows.get(source);
      if (checks) {
        let index = 0;
        xml = xml.replace(/[☐☑]/g, () => {
          const value = extra[checks[index++]];
          return value === true || value === "true" || value === 1 || value === "1" ? "☑" : "☐";
        });
      }
      output.push(xml);
      return number;
    }

    for (let source = 2; source <= 131; source++) {
      const block = blocks.get(source);
      if (block) {
        const start = nextRow;
        for (const [index, line] of textLines(extra[block.key]).entries()) {
          const number = row(Math.min(source + index, block.end), { C: line });
          merges.push("C" + number + ":K" + number);
        }
        for (let old = source; old <= block.end; old++) {
          rowMap.set(old, Math.min(start + old - source, nextRow - 1));
        }
        source = block.end;
      } else if (source === 101) {
        const start = nextRow;
        const groups = new Map<number, typeof data.items>();
        for (const item of data.items) {
          if (!groups.has(item.kpiGroupId)) groups.set(item.kpiGroupId, []);
          groups.get(item.kpiGroupId)!.push(item);
        }
        let index = 0;
        for (const items of groups.values()) {
          const weight = Math.round(items.reduce((sum, item) => sum + item.weight, 0) * 100) / 100;
          const groupRow = row(101, { C: ++index + ". " + items[0].kpiGroupName, H: weight + "%" });
          merges.push("C" + groupRow + ":G" + groupRow);
          for (const item of items) {
            const itemRow = row(102, { C: "- " + item.kpiIndicatorName, H: item.weight + "%", I: item.actualValue, J: item.managerActualValue });
            merges.push("C" + itemRow + ":G" + itemRow, "J" + itemRow + ":K" + itemRow);
          }
        }
        for (let old = 101; old <= 112; old++) rowMap.set(old, Math.min(start + old - 101, nextRow - 1));
        source = 112;
      } else {
        rowMap.set(source, row(source));
      }
    }
    for (const match of sheet.matchAll(/<x:mergeCell\b[^>]*\bref="([A-Z]+)(\d+):([A-Z]+)(\d+)"/g)) {
      const [, left, top, right, bottom] = match;
      const first = Number(top);
      const last = Number(bottom);
      const dynamic = (first >= 101 && first <= 112)
        || [...blocks].some(([start, block]) => first >= start && first <= block.end);
      if (!dynamic) merges.push(left + rowMap.get(first) + ":" + right + rowMap.get(last));
    }
    const lastRow = nextRow - 1;
    sheet = sheet.replace(/<x:sheetData>[\s\S]*?<\/x:sheetData>/, () => "<x:sheetData>" + output.join("") + "</x:sheetData>")
      .replace(/<x:mergeCells\b[^>]*>[\s\S]*?<\/x:mergeCells>/,
        '<x:mergeCells count="' + merges.length + '">' + merges.map(ref => '<x:mergeCell ref="' + ref + '"/>').join("") + "</x:mergeCells>")
      .replace(/<x:dimension[^>]*\/>/, '<x:dimension ref="B2:L' + lastRow + '"/>')
      .replace(/(<x:brk\b[^>]*\bid=")\d+"/g, (_, opening: string) => opening + rowMap.get(53) + '"');
    if (lastRow > 131) sheet = sheet.replace(/fitToHeight="2"/, 'fitToHeight="0" fitToWidth="1"');
    files["xl/worksheets/sheet1.xml"] = strToU8(sheet);
    files["xl/workbook.xml"] = strToU8(sourceWorkbook
      .replace(/BM_NV!\$B\$1:\$L\$131/g, "BM_NV!$B$1:$L$" + lastRow));
    return zipSync(files);
  };
}
