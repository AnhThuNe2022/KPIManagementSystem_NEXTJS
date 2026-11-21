import type { AssignmentScopeType, ConditionStatus } from "@/design-system/registries";

export interface ConditionAssignmentDto {
  id: number;
  userId: string;
  fullName: string | null;
  systemCodeUser: string | null;
  statusCondition: ConditionStatus | string;
  conditionName: string | null;
  isActive: boolean;
  scopeType: AssignmentScopeType | number;
  scopeValue: string | null;
  idValue: string | null;
  description: string | null;
  companyId: number | null;
  companyName: string | null;
  companyCode: string | null;
  departmentId: number | null;
  departmentName: string | null;
}

export interface ConditionAssignmentUserOption {
  id: string;
  fullName: string;
  systemCode: string | null;
}

export interface ConditionAssignmentFilterState {
  keyword: string;
  isActive: string;
  userId: string;
  statusCondition: string;
  scopeType: string;
  companyId: string;
  departmentId: string;
}

export interface ConditionAssignmentDraft {
  id?: number;
  userId: string;
  fullName: string;
  systemCodeUser: string;
  statusCondition: string;
  scopeType: number;
  idValue: string;
  isActive: boolean;
  description: string;
}
