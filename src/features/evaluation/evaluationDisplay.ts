import { EvaluationStatus, type EvaluationFilterOption, type EvaluationTypeOption } from "@/types/evaluation";
import type { CompanyDto } from "@/types/employee";
import type { EvaluationPeriodDto, EvaluationTypeDto } from "./services/evaluationLookupApi";

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

export function requestMessage(cause: unknown, fallback: string) {
  if (cause instanceof Error && cause.message === "UNAUTHORIZED") {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }
  if (cause instanceof Error && cause.message === "FORBIDDEN") {
    return "Bạn chưa có quyền xem danh sách này.";
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
  DepartmentHeadReviewing: "Trưởng phòng đang duyệt", DirectorReviewing: "Giám đốc đang duyệt",
  Imported: "Đã được import", DeputyDirector: "Phó giám đốc", DepartmentDirector: "Giám đốc bộ phận", Over: "Hoàn tất",
};

// The BE Status enum is numeric; preserve its values when rendering template transitions.
const codes = Object.values(EvaluationStatus);
export function statusKey(value: string | number) {
  return typeof value === "number" ? codes[value] ?? "Unknown" : value;
}
export function hrStatusLabel(value: string | number) {
  const key = statusKey(value);
  if (key.includes(";")) return key.split(";").filter(Boolean).map((part) => labels[part] ?? part).join(" / ");
  return labels[key] ?? key;
}
