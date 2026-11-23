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
  systemCode?: string;

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

  startDate?: string | null;
  endDate?: string | null;
}

export interface RoleOption {
  id: string;
  name: string;
}

export enum JobPositionEnumScreen {
  Employee = 1,
  ManagerMid = 2,
  ManagerSenior = 3,
  EmployeeManager = 4,
}

export const JOB_POSITION_SCREEN_OPTIONS: ReadonlyArray<{
  id: string;
  name: string;
}> = [
  { id: String(JobPositionEnumScreen.Employee), name: "Nhân viên" },
  { id: String(JobPositionEnumScreen.ManagerMid), name: "Cấp trung" },
  { id: String(JobPositionEnumScreen.ManagerSenior), name: "Cấp cao" },
  { id: String(JobPositionEnumScreen.EmployeeManager), name: "Nhân viên kiêm quản lý" },
];

export const ROLE_LABELS: Record<string, string> = {
  admin: "Quản trị viên",
  hrsummary: "Nhân sự tổng hợp",
  hrcontractmanagement: "Nhân sự quản lý hợp đồng lao động",
  hr: "Nhân sự chấm điểm",
  manager: "QLCT",
  employee: "Nhân viên",
  director: "QLCC",
  directorsystem: "Tổng giám đốc",
  chairman: "Chủ tịch",
  chiefofstaff: "Chánh văn phòng",
  departmenthead: "Trưởng phòng",
};

export type EmployeeSortOrder = "EmployeeAsc" | "EmployeeDesc";

export type MissingInfoFilterValue = "0" | "7" | "1" | "2" | "5" | "6";

export const EMPLOYEE_SORT_OPTIONS: ReadonlyArray<{
  value: EmployeeSortOrder;
  label: string;
}> = [
  { value: "EmployeeAsc", label: "Tên A → Z" },
  { value: "EmployeeDesc", label: "Tên Z → A" },
];

export const MISSING_INFO_OPTIONS: ReadonlyArray<{
  value: MissingInfoFilterValue;
  label: string;
}> = [
  { value: "0", label: "Không lọc" },
  { value: "7", label: "Nhân viên kiêm nhiệm" },
  { value: "1", label: "Thiếu Mã HT" },
  { value: "2", label: "Thiếu Email" },
  { value: "5", label: "Trùng mã HT" },
  { value: "6", label: "Trùng Email" },
];

export interface EmployeeListFilters {
  keyword: string;
  companyId: string;
  departmentId: string;
  jobId: string;
  roleId: string;
  sortOrder: EmployeeSortOrder;
  missingInfo: MissingInfoFilterValue;
}

export interface EmployeeListItemDto extends EmployeeInforDto {
  userId?: string;
  departmentName?: string;
  jobPositionName?: string;
}
