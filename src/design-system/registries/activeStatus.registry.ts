export type ActiveStatusKey = "active" | "inactive";

export type AstryxDotVariant = "success" | "warning" | "error" | "accent" | "neutral";
export type AstryxBadgeVariant =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "blue"
  | "cyan"
  | "green"
  | "orange"
  | "pink"
  | "purple"
  | "red"
  | "teal"
  | "yellow";

export interface ActiveStatusSpec {
  key: ActiveStatusKey;
  label: string;
  shortLabel: string;
  dotVariant: AstryxDotVariant;
  badgeVariant: AstryxBadgeVariant;
  /** Change "dot" <-> "badge" here to update every isActive indicator across the entire app. */
  presentation: "dot" | "badge";
}

/**
 * SINGLE SOURCE OF TRUTH for `isActive` presentation across Departments,
 * Condition Assignments, Evaluation Periods, Menu Management, and Permissions.
 */
export const ACTIVE_STATUS_REGISTRY: Record<ActiveStatusKey, ActiveStatusSpec> = {
  active: {
    key: "active",
    label: "Đang hoạt động",
    shortLabel: "Hoạt động",
    dotVariant: "success",
    badgeVariant: "green",
    presentation: "dot",
  },
  inactive: {
    key: "inactive",
    label: "Tạm ngưng",
    shortLabel: "Tạm ngưng",
    dotVariant: "neutral",
    badgeVariant: "orange",
    presentation: "dot",
  },
};

export function resolveActiveStatus(isActive: boolean | null | undefined): ActiveStatusSpec {
  return isActive ? ACTIVE_STATUS_REGISTRY.active : ACTIVE_STATUS_REGISTRY.inactive;
}

export const ACTIVE_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: ACTIVE_STATUS_REGISTRY.active.label },
  { value: "inactive", label: ACTIVE_STATUS_REGISTRY.inactive.label },
] as const;
