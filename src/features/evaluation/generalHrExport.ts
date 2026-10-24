import type { GeneralHrEvaluationDto, GeneralHrEvaluationRequest, PagedResult } from "@/types/evaluation";
import { generalHrEvaluationApi } from "./services/generalHrEvaluationApi";
import { formatEvaluationDate, hrStatusLabel } from "./evaluationDisplay";

export async function loadGeneralHrExport(
  body: GeneralHrEvaluationRequest, signal: AbortSignal,
  onProgress: (loaded: number, total: number) => void,
): Promise<PagedResult<GeneralHrEvaluationDto>> {
  const items: GeneralHrEvaluationDto[] = [], ids = new Set<number>();
  const pageSize = 100;
  let total = 0;
  for (let page = 1; page === 1 || items.length < total; page++) {
    signal.throwIfAborted();
    const result = await generalHrEvaluationApi.getPaged({ ...body, Page: page, PageSize: pageSize }, signal);
    signal.throwIfAborted();
    if (page === 1) total = result.total;
    items.push(...result.items);
    for (const item of result.items) ids.add(item.id);
    if (result.total !== total || result.items.length > pageSize ||
        (!result.items.length && items.length < total) || items.length > total || ids.size !== items.length) {
      throw new Error("INCOMPLETE_EXPORT");
    }
    onProgress(items.length, total);
  }
  return { items, total };
}

const encoder = new TextEncoder();
function xml(value: string | number) {
  return String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/[&<>"']/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"})[character]!);
}
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(files: [string, string][]) {
  const parts: Uint8Array[] = [], directory: Uint8Array[] = [];
  let offset = 0, directorySize = 0;
  for (const [filename, content] of files) {
    const name = encoder.encode(filename), data = encoder.encode(content), crc = crc32(data);
    const local = new Uint8Array(30 + name.length), lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x800, true); lv.setUint16(12, 0x21, true);
    lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true); lv.setUint16(26, name.length, true); local.set(name, 30);
    const central = new Uint8Array(46 + name.length), cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x800, true); cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true); central.set(name, 46);
    parts.push(local, data); directory.push(central); offset += local.length + data.length; directorySize += central.length;
  }
  const end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, directorySize, true); ev.setUint32(16, offset, true);
  const output = new Uint8Array(offset + directorySize + 22);
  let cursor = 0;
  for (const part of [...parts, ...directory, end]) { output.set(part, cursor); cursor += part.length; }
  return output;
}

export function createGeneralHrWorkbook(items: GeneralHrEvaluationDto[]) {
  const rows: (string | number)[][] = [["Mã hồ sơ", "UserId", "Mã HT", "Tên nhân viên", "Đơn vị", "Phòng ban", "Kỳ đánh giá", "Bản đánh giá", "Ngày nộp", "Trạng thái", "Quản lý trực tiếp"], ...items.map((item) => [item.id, item.userId, item.systemCode ?? "", item.name, item.companyCode ?? "", item.departmentName ?? "", item.period ?? "", item.templateName ?? "", formatEvaluationDate(item.submitDate ?? null, ""), hrStatusLabel(item.status), item.strDirectManager ?? ""])];
  const sheet = rows.map((row, index) => `<row r="${index + 1}">${row.map((cell, column) => `<c r="${String.fromCharCode(65 + column)}${index + 1}" t="inlineStr"${index === 0 ? ' s="1"' : ""}><is><t xml:space="preserve">${xml(cell)}</t></is></c>`).join("")}</row>`).join("");
  const ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  return zip([
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ["_rels/.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ["xl/workbook.xml", `<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Đánh giá KPI" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
    ["xl/styles.xml", `<styleSheet xmlns="${ns}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF131F6B"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0" fillId="0" borderId="0" xfId="0"/><xf fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
    ["xl/worksheets/sheet1.xml", `<worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="3" width="20" customWidth="1"/><col min="4" max="6" width="32" customWidth="1"/><col min="7" max="8" width="58" customWidth="1"/><col min="9" max="11" width="30" customWidth="1"/></cols><sheetData>${sheet}</sheetData><autoFilter ref="A1:K${rows.length}"/></worksheet>`],
  ]);
}
