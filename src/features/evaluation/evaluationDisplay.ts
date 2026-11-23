import { EvaluationStatus, type EvaluationFilterOption, type EvaluationTypeOption } from "@/features/evaluation/types";
import type { CompanyDto } from "@/features/company/types";
import type { EvaluationPeriodDto, EvaluationTypeDto } from "./types";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatEvaluationDate(value: string | null, fallback = "—") {
  const date = value ? new Date(value) : null;
  if (!date || !Number.isFinite(date.getTime()) || date.getFullYear() < 1900) return fallback;
  return dateFormatter.format(date);
}

const TECHNICAL_ERROR_PATTERN = /SqlTransaction|no longer usable|InternalServerError|Object reference not set|API_ERROR_\d+/i;

export function isTechnicalError(message: string) {
  return TECHNICAL_ERROR_PATTERN.test(message);
}

export function requestMessage(cause: unknown, fallback: string) {
  if (cause instanceof Error && cause.message === "UNAUTHORIZED") {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }
  if (cause instanceof Error && cause.message === "FORBIDDEN") {
    return "Bạn chưa có quyền thực hiện thao tác này.";
  }
  if (cause instanceof Error && isTechnicalError(cause.message)) {
    return isTechnicalError(fallback)
      ? "Không thể xử lý yêu cầu lúc này. Vui lòng thử lại."
      : fallback;
  }
  return fallback;
}

export function companyOptions(rows: CompanyDto[]): EvaluationFilterOption[] {
  return rows.map(row => ({ id: String(row.id), name: row.companyName.trim() }));
}
export function periodOptions(rows: EvaluationPeriodDto[]): EvaluationFilterOption[] {
  return rows.map(row => ({ id: String(row.id), name: row.name.trim() }));
}
export function evaluationTypeOptions(rows: EvaluationTypeDto[]): EvaluationTypeOption[] {
  return rows.map(row => ({ id: String(row.id), name: row.name.trim(), periods: periodOptions(row.listKPIEvaluationPeriodDto) }));
}

const labels: Record<string, string> = {
  Unknown: "Không xác định", Drafted: "Lưu nháp", Submitted: "Đã gửi",
  DirectManagerReviewing: "Quản lý trực tiếp đang duyệt", ManagerMidReviewing: "Quản lý cấp trung đang duyệt",
  HRReviewing: "HR đang duyệt", ManagerSeniorReviewing: "Quản lý cấp cao đang duyệt",
  ChairManReviewing: "Chủ tịch đang duyệt", Rejected: "Bị từ chối", SentHR: "QLCC đã duyệt",
  CompileHRList: "Đã đánh giá xong", DirectorReviewCompileHRList: "Giám đốc duyệt tổng hợp HR",
  CompileChiefOfStaffList: "Tổng hợp văn phòng", ChairManReviewCompile: "Chủ tịch duyệt tổng hợp",
  DepartmentHeadReviewing: "Trưởng phòng đang duyệt", DirectorReviewing: "Tổng giám đốc đang duyệt",
  Imported: "Đã được import", DeputyDirector: "Phó giám đốc ban đang duyệt", DepartmentDirector: "Giám đốc ban đang duyệt",
  Over: "Hoàn tất", HRDepartmentReviewing: "Phòng/Ban NS đang duyệt",
};

const lowerLabels = Object.fromEntries(
  Object.entries(labels).map(([key, label]) => [key.toLowerCase(), label]),
);

// The BE Status enum is numeric; map known backend values explicitly so enum additions don't shift indices.
const numericStatusKeys: Record<number, string> = {
  0: EvaluationStatus.Unknown,
  1: EvaluationStatus.Drafted,
  2: EvaluationStatus.Submitted,
  3: EvaluationStatus.DirectManagerReviewing,
  4: EvaluationStatus.ManagerMidReviewing,
  5: EvaluationStatus.HRReviewing,
  6: EvaluationStatus.ManagerSeniorReviewing,
  7: EvaluationStatus.ChairManReviewing,
  8: EvaluationStatus.Rejected,
  9: EvaluationStatus.SentHR,
  10: EvaluationStatus.CompileHRList,
  11: EvaluationStatus.DirectorReviewCompileHRList,
  12: EvaluationStatus.CompileChiefOfStaffList,
  13: EvaluationStatus.ChairManReviewCompile,
  14: EvaluationStatus.DepartmentHeadReviewing,
  15: EvaluationStatus.DirectorReviewing,
  16: EvaluationStatus.Imported,
  17: EvaluationStatus.DeputyDirector,
  18: EvaluationStatus.DepartmentDirector,
  21: EvaluationStatus.Over,
};
export function statusKey(value: string | number) {
  if (typeof value === "number") return numericStatusKeys[value] ?? "Unknown";
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return numericStatusKeys[Number(trimmed)] ?? "Unknown";
  return trimmed;
}
export function hrStatusLabel(value: string | number, separator = " / ") {
  const key = statusKey(value);
  const labelOf = (part: string) => {
    const clean = part.trim();
    const resolved = /^\d+$/.test(clean) ? (numericStatusKeys[Number(clean)] ?? clean) : clean;
    return labels[resolved] ?? lowerLabels[resolved.toLowerCase()] ?? resolved;
  };
  if (key.includes(";")) return key.split(";").filter(Boolean).map(labelOf).join(separator);
  return labelOf(key);
}
