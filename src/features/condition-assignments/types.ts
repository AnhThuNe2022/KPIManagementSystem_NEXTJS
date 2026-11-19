export enum AssignmentScopeType {
  Company = 1,
  Department = 2,
}

export enum ConditionStatus {
  ByDeparment = "ByDeparment",
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

export enum ConditionStatusScreen {
  ByUnitHR = "ByUnitHR",
  ByUnitHRCompile = "ByUnitHRCompile",
  ByUnitHRCompileHistory = "ByUnitHRCompileHistory",
  ByDirector = "ByDirector",
  ByHRContractManagement = "ByHRContractManagement",
  ByDepartmentDirector = "ByDepartmentDirector",
  ByDeputyDirector = "ByDeputyDirector",
}

export const ADMIN_CONDITION_SCREEN_LIST: readonly ConditionStatusScreen[] = [
  ConditionStatusScreen.ByUnitHR,
  ConditionStatusScreen.ByUnitHRCompile,
  ConditionStatusScreen.ByUnitHRCompileHistory,
  ConditionStatusScreen.ByDirector,
  ConditionStatusScreen.ByHRContractManagement,
  ConditionStatusScreen.ByDepartmentDirector,
  ConditionStatusScreen.ByDeputyDirector,
];

export const STANDARD_CONDITION_SCREEN_LIST: readonly ConditionStatusScreen[] = [
  ConditionStatusScreen.ByUnitHR,
  ConditionStatusScreen.ByUnitHRCompile,
  ConditionStatusScreen.ByDirector,
];

export interface ConditionAssignmentDto {
  id?: number | string | null;
  userId?: string;
  fullName?: string;
  systemCodeUser?: string;
  statusCondition?: string;
  conditionName?: string | null;
  isActive?: boolean;
  scopeType?: AssignmentScopeType | number | string | null;
  scopeValue?: string;
  idValue?: string | number;
  description?: string | null;
  companyId?: number | string | null;
  companyName?: string | null;
  companyCode?: string | null;
  departmentId?: number | string | null;
  departmentName?: string | null;
}

export interface ConditionAssignmentFilters {
  keyword: string;
  userId: string;
  statusCondition: string;
  scopeType: string;
  companyId: string;
  departmentId: string;
  isActive: "" | "true" | "false";
}

export interface ConditionAssignmentDraft {
  statusCondition: string;
  scopeType: AssignmentScopeType;
  companyId: string;
  idValue: string;
  scopeValue: string;
  userId: string;
  fullName: string;
  systemCodeUser: string;
  description?: string | null;
  isActive: boolean;
}

export type ConditionTone =
  | "brand"
  | "crimson"
  | "violet"
  | "sky"
  | "green"
  | "amber"
  | "teal"
  | "neutral";

export const CONDITION_STATUS_META: ReadonlyArray<{
  id: string;
  name: string;
  tone: ConditionTone;
}> = [
  { id: ConditionStatus.ByCustom, name: "Theo cấu hình", tone: "teal" },
  { id: ConditionStatus.ByUnitHR, name: "HR chấm điểm", tone: "sky" },
  { id: ConditionStatus.ByUnitHRCompile, name: "HR tổng hợp", tone: "green" },
  { id: ConditionStatus.ByUnitHRCompileHistory, name: "HR chỉ xem", tone: "neutral" },
  { id: ConditionStatus.ByUnitHRHistory, name: "HR chỉ xem", tone: "neutral" },
  { id: ConditionStatus.ByDirector, name: "Tổng giám đốc", tone: "crimson" },
  {
    id: ConditionStatus.ByHRContractManagement,
    name: "HR Quản lý hợp đồng lao động",
    tone: "amber",
  },
  { id: ConditionStatus.ByDepartmentDirector, name: "Giám đốc Ban", tone: "brand" },
  { id: ConditionStatus.ByDeputyDirector, name: "Phó giám đốc ban", tone: "violet" },
];

export const SCOPE_TYPE_OPTIONS: ReadonlyArray<{
  id: string;
  name: string;
}> = [
  { id: String(AssignmentScopeType.Company), name: "Công ty" },
  { id: String(AssignmentScopeType.Department), name: "Phòng ban" },
];

export function getConditionStatusDisplay(status?: string | null): string {
  const value = (status ?? "").trim();
  if (!value) return "Chưa phân loại";
  const matched = CONDITION_STATUS_META.find(
    (item) => item.id.toLowerCase() === value.toLowerCase(),
  );
  return matched ? matched.name : value;
}

export function getConditionStatusOptions(isAdmin: boolean) {
  const list = isAdmin ? ADMIN_CONDITION_SCREEN_LIST : STANDARD_CONDITION_SCREEN_LIST;
  return list.map((status) => {
    const meta = CONDITION_STATUS_META.find((item) => item.id === status);
    return {
      id: status,
      name: meta?.name ?? status,
      tone: meta?.tone ?? ("brand" as ConditionTone),
    };
  });
}

export function getConditionMeta(raw?: string | null): {
  key: string;
  label: string;
  tone: ConditionTone;
} {
  const value = (raw ?? "").trim();
  if (!value) return { key: "", label: "Chưa phân loại", tone: "neutral" };

  const matched = CONDITION_STATUS_META.find(
    (option) =>
      option.id.toLowerCase() === value.toLowerCase() ||
      option.name.toLowerCase() === value.toLowerCase(),
  );
  if (matched) {
    return { key: matched.id, label: matched.name, tone: matched.tone };
  }

  return {
    key: value,
    label: value,
    tone: "neutral",
  };
}

export function inferScopeType(item: ConditionAssignmentDto): AssignmentScopeType {
  const explicit = String(item.scopeType ?? "").trim().toLowerCase();
  if (explicit === "2" || explicit === "department") return AssignmentScopeType.Department;
  if (explicit === "1" || explicit === "company") return AssignmentScopeType.Company;
  if (item.departmentId != null && String(item.departmentId).trim() !== "") {
    return AssignmentScopeType.Department;
  }
  const label = (item.scopeValue ?? "").trim().toLowerCase();
  if (/^(công ty|cty|tập đoàn)/.test(label)) return AssignmentScopeType.Company;
  if (label && !label.includes("công ty")) return AssignmentScopeType.Department;
  return AssignmentScopeType.Company;
}
