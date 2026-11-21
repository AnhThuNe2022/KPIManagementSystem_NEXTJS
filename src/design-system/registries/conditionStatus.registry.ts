import type { AstryxBadgeVariant } from "./activeStatus.registry";

/**
 * Backend ConditionStatus enum values (preserves backend typo "ByDeparment").
 */
export enum ConditionStatus {
  ByDepartment = "ByDeparment",
  ByCustom = "ByCustom",
  ByUnitHR = "ByUnitHR",
  ByUnitHRHistory = "ByUnitHRHistory",
  ByUnitHRCompile = "ByUnitHRCompile",
  ByUnitHRCompileHistory = "ByUnitHRCompileHistory",
  ByDirector = "ByDirector",
  ByHRContractManagement = "ByHRContractManagement",
  ByDepartmentDirector = "ByDepartmentDirector",
  ByDeputyDirector = "ByDeputyDirector",
}

export interface ConditionStatusSpec {
  key: ConditionStatus;
  label: string;
  badgeVariant: AstryxBadgeVariant;
  tokenColor: "teal" | "blue" | "green" | "gray" | "red" | "orange" | "purple" | "cyan";
}

/**
 * SINGLE SOURCE OF TRUTH for all 10 ConditionStatus values with distinct visual tones.
 */
export const CONDITION_STATUS_REGISTRY: Record<ConditionStatus, ConditionStatusSpec> = {
  [ConditionStatus.ByDepartment]: {
    key: ConditionStatus.ByDepartment,
    label: "Theo phòng ban",
    badgeVariant: "cyan",
    tokenColor: "cyan",
  },
  [ConditionStatus.ByCustom]: {
    key: ConditionStatus.ByCustom,
    label: "Theo cấu hình",
    badgeVariant: "teal",
    tokenColor: "teal",
  },
  [ConditionStatus.ByUnitHR]: {
    key: ConditionStatus.ByUnitHR,
    label: "HR chấm điểm",
    badgeVariant: "blue",
    tokenColor: "blue",
  },
  [ConditionStatus.ByUnitHRCompile]: {
    key: ConditionStatus.ByUnitHRCompile,
    label: "HR tổng hợp",
    badgeVariant: "green",
    tokenColor: "green",
  },
  [ConditionStatus.ByUnitHRHistory]: {
    key: ConditionStatus.ByUnitHRHistory,
    label: "HR chỉ xem",
    badgeVariant: "neutral",
    tokenColor: "gray",
  },
  [ConditionStatus.ByUnitHRCompileHistory]: {
    key: ConditionStatus.ByUnitHRCompileHistory,
    label: "HR chỉ xem",
    badgeVariant: "neutral",
    tokenColor: "gray",
  },
  [ConditionStatus.ByDirector]: {
    key: ConditionStatus.ByDirector,
    label: "Tổng giám đốc",
    badgeVariant: "red",
    tokenColor: "red",
  },
  [ConditionStatus.ByHRContractManagement]: {
    key: ConditionStatus.ByHRContractManagement,
    label: "HR Quản lý hợp đồng lao động",
    badgeVariant: "orange",
    tokenColor: "orange",
  },
  [ConditionStatus.ByDepartmentDirector]: {
    key: ConditionStatus.ByDepartmentDirector,
    label: "Giám đốc Ban",
    badgeVariant: "blue",
    tokenColor: "blue",
  },
  [ConditionStatus.ByDeputyDirector]: {
    key: ConditionStatus.ByDeputyDirector,
    label: "Phó giám đốc ban",
    badgeVariant: "purple",
    tokenColor: "purple",
  },
};

export const ADMIN_CONDITION_OPTIONS: ConditionStatus[] = [
  ConditionStatus.ByUnitHR,
  ConditionStatus.ByUnitHRCompile,
  ConditionStatus.ByUnitHRCompileHistory,
  ConditionStatus.ByDirector,
  ConditionStatus.ByHRContractManagement,
  ConditionStatus.ByDepartmentDirector,
  ConditionStatus.ByDeputyDirector,
];

export const STANDARD_CONDITION_OPTIONS: ConditionStatus[] = [
  ConditionStatus.ByUnitHR,
  ConditionStatus.ByUnitHRCompile,
  ConditionStatus.ByDirector,
];

const LOWER_CONDITION_LOOKUP = new Map<string, ConditionStatusSpec>(
  Object.values(CONDITION_STATUS_REGISTRY).map((s) => [s.key.toLowerCase(), s]),
);

export function resolveConditionStatus(
  raw: string | null | undefined,
  fallbackName?: string | null,
): ConditionStatusSpec {
  const key = String(raw ?? "").trim().toLowerCase();
  const matched = LOWER_CONDITION_LOOKUP.get(key);
  if (matched) return matched;
  return {
    key: ConditionStatus.ByCustom,
    label: fallbackName?.trim() || raw?.trim() || "Không xác định",
    badgeVariant: "neutral",
    tokenColor: "gray",
  };
}
