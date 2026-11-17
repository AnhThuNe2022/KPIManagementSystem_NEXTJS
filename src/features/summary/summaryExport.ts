import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { findElement, getChildElements, getMarkupInsideElement, getOpeningTagMarkup, replaceElement, sanitizeTextContent, setMarkupInsideElement, type Attributes, type FoundElement } from "write-excel-file/utility";
import type { SummaryDetail } from "./types";

export function createSummaryWorkbook(items: SummaryDetail[], template: ArrayBuffer) {
  const files = unzipSync(new Uint8Array(template));
  let sheet = strFromU8(files["xl/worksheets/sheet1.xml"]);
  const sheetData = findElement(sheet, "sheetData");
  if (!sheetData) throw new Error("INVALID_SUMMARY_TEMPLATE");
  const rows = getChildElements(sheet, sheetData);
  const sample = rows.find(row => Number(row.openingTagAttributes.r) === 10);
  if (!sample) throw new Error("INVALID_SUMMARY_TEMPLATE");
  const cells = getChildElements(sheet, sample).slice(0, 10);
  const offset = items.length - 9;

  function copyRow(row: FoundElement, shift = 0) {
    const attributes = { ...row.openingTagAttributes, r: Number(row.openingTagAttributes.r) + shift };
    const content = getMarkupInsideElement(sheet, row).replace(/\br="([A-Z]+)(\d+)"/g,
      (_, column: string, number: string) => 'r="' + column + (Number(number) + shift) + '"');
    return getOpeningTagMarkup("row", attributes) + content + "</row>";
  }

  const header = rows.filter(row => Number(row.openingTagAttributes.r) < 10).map(row => copyRow(row));
  const body = items.map((item, index) => {
    const rowNumber = index + 10;
    const values = [index + 1, item.userId, item.userName, item.jobName,
      [item.companyCode, item.departmentName].filter(Boolean).join(" - "), item.score, item.managerSocre, item.rPercent == null ? null : item.rPercent * 100, null, null];
    const content = cells.map((cell, column) => {
      const value = values[column];
      const attributes: Attributes = { ...cell.openingTagAttributes, r: String.fromCharCode(65 + column) + rowNumber };
      delete attributes.t;
      if (value == null) return getOpeningTagMarkup("c", attributes) + "</c>";
      if (typeof value === "number") {
        return getOpeningTagMarkup("c", attributes) + "<v>" + value + "</v></c>";
      }
      return getOpeningTagMarkup("c", { ...attributes, t: "inlineStr" })
        + '<is><t xml:space="preserve">' + sanitizeTextContent(value) + "</t></is></c>";
    }).join("");
    return getOpeningTagMarkup("row", { ...sample.openingTagAttributes, r: rowNumber }) + content + "</row>";
  });
  const footer = rows.filter(row => Number(row.openingTagAttributes.r) >= 19 && Number(row.openingTagAttributes.r) <= 25)
    .map(row => copyRow(row, offset));
  sheet = setMarkupInsideElement(sheet, sheetData, [...header, ...body, ...footer].join(""));

  const merges = findElement(sheet, "mergeCells");
  if (merges) {
    const content = getMarkupInsideElement(sheet, merges).replace(/([A-Z]+)(\d+)/g,
      (_, column: string, row: string) => column + (Number(row) >= 19 ? Number(row) + offset : Number(row)));
    sheet = setMarkupInsideElement(sheet, merges, content);
  }
  const dimension = findElement(sheet, "dimension");
  if (dimension) sheet = replaceElement(sheet, dimension, '<dimension ref="A1:J' + (25 + offset) + '"/>');
  files["xl/worksheets/sheet1.xml"] = strToU8(sheet);

  const periods = new Set(items.map(item => item.startDate + "/" + item.endDate));
  const first = items[0];
  const formatDate = (date: string) => date.split("T")[0].split("-").reverse().join("/");
  const periodLabel = periods.size === 1 && first
    ? "Kỳ đánh giá: " + formatDate(first.startDate) + " đến " + formatDate(first.endDate)
    : "Kỳ đánh giá: Nhiều kỳ đánh giá";
  files["xl/sharedStrings.xml"] = strToU8(strFromU8(files["xl/sharedStrings.xml"])
    .replace(/Kỳ đánh giá: [^<]+/, sanitizeTextContent(periodLabel))
    .replace(/Tp\. Hồ Chí Minh, Ngày[^<]+/, "Tp. Hồ Chí Minh, ngày " + new Date().toLocaleDateString("vi-VN")));

  let workbook = strFromU8(files["xl/workbook.xml"]);
  const names = findElement(workbook, "definedNames");
  const printArea = `<definedName name="_xlnm.Print_Area" localSheetId="0">'BM TONG HOP_Ban'!$A$1:$J$${25 + offset}</definedName>`;
  if (names) workbook = setMarkupInsideElement(workbook, names, getMarkupInsideElement(workbook, names) + printArea);
  files["xl/workbook.xml"] = strToU8(workbook);
  return new Blob([zipSync(files).buffer as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
