// types/organization.ts

export enum AssignmentType {
  Primary = 1,
  Concurrent = 2,
}

export function getAssignmentTypeText(
  type?: AssignmentType
): string {
  switch (type) {
    case AssignmentType.Primary:
      return "Chính";

    case AssignmentType.Concurrent:
      return "Kiêm nhiệm";

    default:
      return "";
  }
}

export interface UserOrganizationDto {
  id?: number;

  userId?: string;
  userName?:string;
  
  assignmentType: AssignmentType;
  employeeCode?: string;

  companyId?: number;
  companyName?: string;

  departmentId?: number;
  departmentName?: string;

  jobPositionId?: number;
  jobPositionName?: string;

  jobTitle?: string;

  managerID?: string;
  managerName?: string;
  managerJobTitle?: string;
  managerDepartmentName?: string;
  managerCompanyName?: string;
  managerOrganizationId?:number,

  isActive: boolean;
  isDeleted: boolean;
}

// types/condition.ts
export interface ConditionAssignmentDto {
  userId?: string;

  fullName?: string;

  systemCodeUser?: string;

  statusCondition?: string;

  isActive?: boolean;

  scopeValue?: string;

  idValue?: string | number;
}

export interface ManagerDto {
  id: string;
  fullName: string;
  employeeCode?: string;
  jobTitle?: string;
}