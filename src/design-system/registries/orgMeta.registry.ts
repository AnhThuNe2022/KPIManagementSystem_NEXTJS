import type { AstryxBadgeVariant } from "./activeStatus.registry";

export enum AssignmentType {
  Primary = 1,
  Concurrent = 2,
}

export enum AssignmentScopeType {
  Company = 1,
  Department = 2,
}

export type PeriodTypeKey = "None" | "Month" | "Year" | "Quarter" | "HaftYear" | "Unknown";

export interface SimpleBadgeSpec {
  label: string;
  badgeVariant: AstryxBadgeVariant;
}

/** SINGLE SOURCE OF TRUTH for User Organization Assignment Type (Chính / Kiêm nhiệm). */
export const ASSIGNMENT_TYPE_REGISTRY: Record<AssignmentType, SimpleBadgeSpec> = {
  [AssignmentType.Primary]: { label: "Chính", badgeVariant: "blue" },
  [AssignmentType.Concurrent]: { label: "Kiêm nhiệm", badgeVariant: "orange" },
};

export function resolveAssignmentType(value: number | null | undefined): SimpleBadgeSpec {
  return value === AssignmentType.Primary
    ? ASSIGNMENT_TYPE_REGISTRY[AssignmentType.Primary]
    : ASSIGNMENT_TYPE_REGISTRY[AssignmentType.Concurrent];
}

/** SINGLE SOURCE OF TRUTH for Condition Assignment Scope Type (Công ty / Phòng ban). */
export const SCOPE_TYPE_REGISTRY: Record<AssignmentScopeType, SimpleBadgeSpec> = {
  [AssignmentScopeType.Company]: { label: "Công ty", badgeVariant: "red" },
  [AssignmentScopeType.Department]: { label: "Phòng ban", badgeVariant: "blue" },
};

export function resolveScopeType(value: number | string | null | undefined): SimpleBadgeSpec {
  const isDept = String(value) === "2" || String(value).toLowerCase() === "department";
  return isDept
    ? SCOPE_TYPE_REGISTRY[AssignmentScopeType.Department]
    : SCOPE_TYPE_REGISTRY[AssignmentScopeType.Company];
}

/** SINGLE SOURCE OF TRUTH for KPI Evaluation Period Type (backend spells HalfYear as HaftYear). */
export const PERIOD_TYPE_REGISTRY: Record<PeriodTypeKey, SimpleBadgeSpec & { numericCode: number }> = {
  None: { label: "Không chọn", badgeVariant: "neutral", numericCode: 0 },
  Month: { label: "Theo tháng", badgeVariant: "blue", numericCode: 1 },
  Year: { label: "Theo năm", badgeVariant: "red", numericCode: 2 },
  Quarter: { label: "Theo quý", badgeVariant: "purple", numericCode: 3 },
  HaftYear: { label: "6 tháng", badgeVariant: "teal", numericCode: 4 },
  Unknown: { label: "Không xác định", badgeVariant: "neutral", numericCode: 5 },
};

const PERIOD_NUMERIC_TO_KEY: Record<number, PeriodTypeKey> = {
  0: "None",
  1: "Month",
  2: "Year",
  3: "Quarter",
  4: "HaftYear",
  5: "Unknown",
};

export function normalizePeriodType(raw: string | number | null | undefined): PeriodTypeKey {
  if (typeof raw === "number") {
    return PERIOD_NUMERIC_TO_KEY[raw] ?? "Unknown";
  }
  const str = String(raw ?? "").trim();
  if (!str) return "None";
  const num = Number(str);
  if (Number.isInteger(num) && num in PERIOD_NUMERIC_TO_KEY) {
    return PERIOD_NUMERIC_TO_KEY[num];
  }
  const lower = str.toLowerCase();
  if (lower === "month") return "Month";
  if (lower === "quarter") return "Quarter";
  if (lower === "year") return "Year";
  if (lower === "haftyear" || lower === "halfyear") return "HaftYear";
  if (lower === "none") return "None";
  if (lower === "unknow" || lower === "unknown") return "Unknown";
  return "Unknown";
}

export function resolvePeriodType(raw: string | number | null | undefined) {
  return PERIOD_TYPE_REGISTRY[normalizePeriodType(raw)];
}

/** SINGLE SOURCE OF TRUTH for Period Status (0..3). */
export const PERIOD_STATUS_REGISTRY: Record<number, SimpleBadgeSpec> = {
  0: { label: "Không xác định", badgeVariant: "neutral" },
  1: { label: "Mở", badgeVariant: "green" },
  2: { label: "Khóa", badgeVariant: "orange" },
  3: { label: "Đóng", badgeVariant: "neutral" },
};

export function resolvePeriodStatus(raw: number | string | null | undefined): SimpleBadgeSpec {
  if (typeof raw === "string") {
    const lower = raw.trim().toLowerCase();
    if (lower === "active" || lower === "open" || lower === "1") return PERIOD_STATUS_REGISTRY[1];
    if (lower === "locked" || lower === "2") return PERIOD_STATUS_REGISTRY[2];
    if (lower === "closed" || lower === "3") return PERIOD_STATUS_REGISTRY[3];
    if (lower === "none" || lower === "0") return PERIOD_STATUS_REGISTRY[0];
  }
  const n = Number(raw);
  return PERIOD_STATUS_REGISTRY[n] ?? PERIOD_STATUS_REGISTRY[0];
}

/** SINGLE SOURCE OF TRUTH for Permission visibility (`isPublic`). */
export const PUBLIC_STATUS_REGISTRY = {
  public: { label: "Công khai", badgeVariant: "blue" as AstryxBadgeVariant },
  private: { label: "Nội bộ", badgeVariant: "neutral" as AstryxBadgeVariant },
} as const;

export function resolvePublicStatus(isPublic: boolean | null | undefined): SimpleBadgeSpec {
  return isPublic ? PUBLIC_STATUS_REGISTRY.public : PUBLIC_STATUS_REGISTRY.private;
}

/** SINGLE SOURCE OF TRUTH for Notification read state (`isRead`). */
export const READ_STATUS_REGISTRY = {
  unread: { label: "Chưa đọc", badgeVariant: "red" as AstryxBadgeVariant },
  read: { label: "Đã đọc", badgeVariant: "neutral" as AstryxBadgeVariant },
} as const;

export function resolveReadStatus(isRead: boolean | null | undefined): SimpleBadgeSpec {
  return isRead ? READ_STATUS_REGISTRY.read : READ_STATUS_REGISTRY.unread;
}

/**
 * SINGLE SOURCE OF TRUTH for Company Logos (logo colors are NEVER altered by CSS).
 */
export const COMPANY_LOGO_MAP: Record<string, string> = {
  BGLS: "/brand/bgls.svg",
  TLMT: "/brand/tlmt.svg",
  DCG: "/brand/deoca-icon.svg",
};

export const DEFAULT_COMPANY_LOGO = "/brand/deoca-icon.svg";

export function resolveCompanyLogo(companyCode: string | null | undefined): string {
  const key = String(companyCode ?? "").trim().toUpperCase();
  return COMPANY_LOGO_MAP[key] ?? DEFAULT_COMPANY_LOGO;
}

/** Summary job positions preserved from legacy SummaryList. */
export const SUMMARY_JOB_POSITION_OPTIONS = [
  { value: "1", label: "Nhân viên" },
  { value: "2", label: "Quản lý cấp trung" },
  { value: "3", label: "Quản lý cấp cao" },
] as const;
