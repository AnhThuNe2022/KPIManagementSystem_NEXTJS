export interface EmployeeInforDto {
  id: string;
  fullName: string;
  email: string;
  departmentId?: number | null;
  department?: { id: number; name: string } | null;
  jobPositionId?: number | null;
  jobPosition?: { id: number; name: string } | null;
  employeeCode?: string | null;
  systemCode?: string | null;
  jobTitle?: string | null;
  userName?: string | null;
  companyId?: number | null;
  companyName?: string | null;
  roles?: string[];
}

export interface UserOrganizationDto {
  id?: number;
  /** Client-only stable key for unsaved drafts so multiple new rows never collide or overwrite each other. */
  _localKey?: string;
  userId?: string;
  userName?: string;
  assignmentType: number;
  employeeCode?: string | null;
  companyId: number;
  companyName?: string | null;
  companyCode?: string | null;
  departmentId: number;
  departmentName?: string | null;
  jobPositionId?: number | null;
  jobPositionName?: string | null;
  jobTitle?: string | null;
  managerID?: string | null;
  managerName?: string | null;
  managerJobTitle?: string | null;
  managerDepartmentName?: string | null;
  managerCompanyName?: string | null;
  managerOrganizationId?: number | null;
  isActive?: boolean;
  isDeleted?: boolean;
}

export interface AvailableManager {
  id: string | number;
  userId?: string | null;
  userName: string;
  systemCode?: string | null;
  employeeCode?: string | null;
  jobTitle?: string | null;
  jobPositionName?: string | null;
  companyId?: number | null;
  departmentId?: number | null;
  departmentName?: string | null;
  companyName?: string | null;
}

export interface ChangePasswordDto {
  cmsUsername?: string;
  cmsPassword?: string;
  currentPassword?: string;
  newPassword: string;
  confirmPassword: string;
}
