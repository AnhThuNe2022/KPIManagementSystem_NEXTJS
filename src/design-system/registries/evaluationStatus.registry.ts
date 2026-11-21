import type { AstryxBadgeVariant } from "./activeStatus.registry";

export enum EvaluationStatus {
  Unknown = "Unknown",
  Drafted = "Drafted",
  Submitted = "Submitted",
  DirectManagerReviewing = "DirectManagerReviewing",
  ManagerMidReviewing = "ManagerMidReviewing",
  HRReviewing = "HRReviewing",
  ManagerSeniorReviewing = "ManagerSeniorReviewing",
  ChairManReviewing = "ChairManReviewing",
  Rejected = "Rejected",
  SentHR = "SentHR",
  CompileHRList = "CompileHRList",
  DirectorReviewCompileHRList = "DirectorReviewCompileHRList",
  CompileChiefOfStaffList = "CompileChiefOfStaffList",
  ChairManReviewCompile = "ChairManReviewCompile",
  DepartmentHeadReviewing = "DepartmentHeadReviewing",
  DirectorReviewing = "DirectorReviewing",
  Imported = "Imported",
  DeputyDirector = "DeputyDirector",
  DepartmentDirector = "DepartmentDirector",
  HRDepartmentReviewing = "HRDepartmentReviewing",
  Over = "Over",
}

export type EvaluationStatusKey = EvaluationStatus | "Approved" | "Pending";
export type EvaluationStatusGroup = "waiting" | "done" | "rejected" | "other";

export interface EvaluationStatusSpec {
  key: EvaluationStatusKey;
  label: string;
  shortLabel: string;
  badgeVariant: AstryxBadgeVariant;
  group: EvaluationStatusGroup;
  isReviewingStep: boolean;
}

/**
 * SINGLE SOURCE OF TRUTH for all 21 EvaluationStatus values + Approved/Pending.
 * Replaces 5 conflicting legacy switch/map tables across Evaluation & Summary screens.
 */
export const EVALUATION_STATUS_REGISTRY: Record<EvaluationStatusKey, EvaluationStatusSpec> = {
  [EvaluationStatus.Unknown]: {
    key: EvaluationStatus.Unknown,
    label: "Không xác định",
    shortLabel: "Không rõ",
    badgeVariant: "neutral",
    group: "other",
    isReviewingStep: false,
  },
  [EvaluationStatus.Drafted]: {
    key: EvaluationStatus.Drafted,
    label: "Lưu nháp",
    shortLabel: "Nháp",
    badgeVariant: "neutral",
    group: "other",
    isReviewingStep: false,
  },
  [EvaluationStatus.Submitted]: {
    key: EvaluationStatus.Submitted,
    label: "Đã nộp đánh giá",
    shortLabel: "Đã nộp",
    badgeVariant: "blue",
    group: "waiting",
    isReviewingStep: false,
  },
  [EvaluationStatus.DirectManagerReviewing]: {
    key: EvaluationStatus.DirectManagerReviewing,
    label: "Quản lý trực tiếp đang duyệt",
    shortLabel: "QLTT đang duyệt",
    badgeVariant: "orange",
    group: "waiting",
    isReviewingStep: true,
  },
  [EvaluationStatus.ManagerMidReviewing]: {
    key: EvaluationStatus.ManagerMidReviewing,
    label: "Quản lý cấp trung đang duyệt",
    shortLabel: "QLCT đang duyệt",
    badgeVariant: "orange",
    group: "waiting",
    isReviewingStep: true,
  },
  [EvaluationStatus.HRReviewing]: {
    key: EvaluationStatus.HRReviewing,
    label: "HR đang duyệt",
    shortLabel: "HR đang duyệt",
    badgeVariant: "purple",
    group: "waiting",
    isReviewingStep: true,
  },
  [EvaluationStatus.HRDepartmentReviewing]: {
    key: EvaluationStatus.HRDepartmentReviewing,
    label: "Phòng HR đang duyệt",
    shortLabel: "Phòng HR duyệt",
    badgeVariant: "purple",
    group: "waiting",
    isReviewingStep: true,
  },
  [EvaluationStatus.ManagerSeniorReviewing]: {
    key: EvaluationStatus.ManagerSeniorReviewing,
    label: "Quản lý cấp cao đang duyệt",
    shortLabel: "QLCC đang duyệt",
    badgeVariant: "blue",
    group: "waiting",
    isReviewingStep: true,
  },
  [EvaluationStatus.ChairManReviewing]: {
    key: EvaluationStatus.ChairManReviewing,
    label: "Chủ tịch đang duyệt",
    shortLabel: "Chủ tịch duyệt",
    badgeVariant: "blue",
    group: "waiting",
    isReviewingStep: true,
  },
  [EvaluationStatus.DepartmentHeadReviewing]: {
    key: EvaluationStatus.DepartmentHeadReviewing,
    label: "Trưởng phòng đang duyệt",
    shortLabel: "Trưởng phòng duyệt",
    badgeVariant: "orange",
    group: "waiting",
    isReviewingStep: true,
  },
  [EvaluationStatus.DirectorReviewing]: {
    key: EvaluationStatus.DirectorReviewing,
    label: "Tổng giám đốc đang duyệt",
    shortLabel: "TGĐ đang duyệt",
    badgeVariant: "blue",
    group: "waiting",
    isReviewingStep: true,
  },
  [EvaluationStatus.DeputyDirector]: {
    key: EvaluationStatus.DeputyDirector,
    label: "Phó giám đốc ban đang duyệt",
    shortLabel: "PGĐ ban duyệt",
    badgeVariant: "blue",
    group: "waiting",
    isReviewingStep: true,
  },
  [EvaluationStatus.DepartmentDirector]: {
    key: EvaluationStatus.DepartmentDirector,
    label: "Giám đốc ban đang duyệt",
    shortLabel: "GĐ ban duyệt",
    badgeVariant: "blue",
    group: "waiting",
    isReviewingStep: true,
  },
  [EvaluationStatus.SentHR]: {
    key: EvaluationStatus.SentHR,
    label: "QLCC đã duyệt",
    shortLabel: "QLCC đã duyệt",
    badgeVariant: "teal",
    group: "done",
    isReviewingStep: false,
  },
  [EvaluationStatus.CompileHRList]: {
    key: EvaluationStatus.CompileHRList,
    label: "Tổng hợp HR",
    shortLabel: "Tổng hợp HR",
    badgeVariant: "green",
    group: "done",
    isReviewingStep: false,
  },
  [EvaluationStatus.DirectorReviewCompileHRList]: {
    key: EvaluationStatus.DirectorReviewCompileHRList,
    label: "Giám đốc duyệt tổng hợp HR",
    shortLabel: "GĐ duyệt tổng hợp",
    badgeVariant: "blue",
    group: "waiting",
    isReviewingStep: true,
  },
  [EvaluationStatus.CompileChiefOfStaffList]: {
    key: EvaluationStatus.CompileChiefOfStaffList,
    label: "Tổng hợp văn phòng",
    shortLabel: "Tổng hợp VP",
    badgeVariant: "cyan",
    group: "waiting",
    isReviewingStep: false,
  },
  [EvaluationStatus.ChairManReviewCompile]: {
    key: EvaluationStatus.ChairManReviewCompile,
    label: "Chủ tịch duyệt tổng hợp",
    shortLabel: "CT duyệt tổng hợp",
    badgeVariant: "blue",
    group: "waiting",
    isReviewingStep: true,
  },
  [EvaluationStatus.Imported]: {
    key: EvaluationStatus.Imported,
    label: "Đã nhập từ file",
    shortLabel: "Đã nhập",
    badgeVariant: "neutral",
    group: "other",
    isReviewingStep: false,
  },
  [EvaluationStatus.Rejected]: {
    key: EvaluationStatus.Rejected,
    label: "Bị trả lại",
    shortLabel: "Từ chối",
    badgeVariant: "red",
    group: "rejected",
    isReviewingStep: false,
  },
  [EvaluationStatus.Over]: {
    key: EvaluationStatus.Over,
    label: "Hoàn tất",
    shortLabel: "Hoàn tất",
    badgeVariant: "green",
    group: "done",
    isReviewingStep: false,
  },
  Approved: {
    key: "Approved",
    label: "Đã duyệt",
    shortLabel: "Đã duyệt",
    badgeVariant: "green",
    group: "done",
    isReviewingStep: false,
  },
  Pending: {
    key: "Pending",
    label: "Đang chờ phê duyệt",
    shortLabel: "Chờ duyệt",
    badgeVariant: "orange",
    group: "waiting",
    isReviewingStep: true,
  },
};

export const NUMERIC_EVALUATION_STATUS_MAP: Record<number, EvaluationStatus> = {
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
  19: EvaluationStatus.HRDepartmentReviewing,
  21: EvaluationStatus.Over,
};

/** Exact 9 status filter options preserved from legacy GeneralHrEvaluations (/admin/evaluationList). */
export const GENERAL_HR_FILTER_STATUS_KEYS: EvaluationStatus[] = [
  EvaluationStatus.Unknown,
  EvaluationStatus.Drafted,
  EvaluationStatus.Rejected,
  EvaluationStatus.DirectManagerReviewing,
  EvaluationStatus.HRReviewing,
  EvaluationStatus.CompileHRList,
  EvaluationStatus.ManagerSeniorReviewing,
  EvaluationStatus.SentHR,
  EvaluationStatus.Imported,
];

/** Status IDs excluded in Change Status modal per legacy business rule (Drafted = 1, SentHR = 9). */
export const CHANGE_STATUS_EXCLUDED_IDS = new Set<number>([1, 9]);

const LOWER_LOOKUP = new Map<string, EvaluationStatusSpec>(
  Object.values(EVALUATION_STATUS_REGISTRY).map((spec) => [spec.key.toLowerCase(), spec]),
);

export function resolveEvaluationStatus(
  status: string | number | null | undefined,
  options?: { isRejected?: boolean; fallbackLabel?: string },
): EvaluationStatusSpec {
  if (options?.isRejected) {
    return EVALUATION_STATUS_REGISTRY[EvaluationStatus.Rejected];
  }
  if (typeof status === "number") {
    const key = NUMERIC_EVALUATION_STATUS_MAP[status] ?? EvaluationStatus.Unknown;
    return EVALUATION_STATUS_REGISTRY[key];
  }
  const raw = String(status ?? "").trim();
  if (!raw) {
    return options?.fallbackLabel
      ? { ...EVALUATION_STATUS_REGISTRY[EvaluationStatus.Unknown], label: options.fallbackLabel, shortLabel: options.fallbackLabel }
      : EVALUATION_STATUS_REGISTRY[EvaluationStatus.Unknown];
  }
  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric in NUMERIC_EVALUATION_STATUS_MAP) {
    return EVALUATION_STATUS_REGISTRY[NUMERIC_EVALUATION_STATUS_MAP[numeric]];
  }
  const matched = LOWER_LOOKUP.get(raw.toLowerCase());
  if (matched) return matched;
  return {
    key: EvaluationStatus.Unknown,
    label: options?.fallbackLabel || raw,
    shortLabel: options?.fallbackLabel || raw,
    badgeVariant: "neutral",
    group: "other",
    isReviewingStep: /reviewing$/i.test(raw),
  };
}

export function splitEvaluationStatuses(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function isEditableEvaluationStatus(status: string | null | undefined): boolean {
  const lower = String(status ?? "").trim().toLowerCase();
  return lower === "drafted" || lower === "rejected";
}
