import type { DepartmentDto } from "@/features/department/types";

export interface EmployeeInforDto {
  id?: string;
  fullName?: string;
  email?: string;

  departmentId?: number;
  department?: DepartmentDto;

  jobPositionId?: number;
  jobPosition?: JobPosition;

  employeeCode?: string;
  systemCode?: string;
  jobTitle?: string;
  userName?: string;

  companyId?: number;
  companyName?: string;

  roles?: string[];
}

export interface JobPosition {
  id: number;
  name: string;
}

export interface ChangePasswordDto {
  cmsUsername?: string;
  cmsPassword?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}


export enum AssignmentType {
  Primary = 1,
  Concurrent = 2,
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
