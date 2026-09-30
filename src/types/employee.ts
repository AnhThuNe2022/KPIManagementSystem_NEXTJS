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

export interface DepartmentDto {
  id: number;
  name: string;
  description?: string;
  companyId?: number;
  companyName?: string;
  isActive: boolean;
}

export interface CompanyDto {
  id: number;
  companyName: string;
}

export interface ChangePasswordDto {
  cmsUsername?: string;
  cmsPassword?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export interface FilterString {
  filters: Record<string, string | null>;
}

export interface NotificationDto {
  alertGroupId?: string;
  userId?: string;
  senderUserId?: string;
  codeNoti?: string;
  message?: string;
}

export enum EnumCompanyCode {
  DCG = 3,
  BGLS,
}

export enum AssignmentScopeType
{
    Company = 1,
    Department = 2,
}
