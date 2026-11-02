export enum AssignmentScopeType
{
    Company = 1,
    Department = 2,
}


export interface ConditionAssignmentDto {
  userId?: string;

  fullName?: string;

  systemCodeUser?: string;

  statusCondition?: string;

  isActive?: boolean;

  scopeValue?: string;

  idValue?: string | number;
}


export enum ConditionStatus {
  ByDeparment = "ByDeparment",
  ByCustom = "ByCustom",
  ByUnitHR = "ByUnitHR",
  ByUnitHRHistory = "ByUnitHRHistory",
  ByUnitHRCompile = "ByUnitHRCompile",
  ByUnitHRCompileHistory = "ByUnitHRCompileHistory",
}
