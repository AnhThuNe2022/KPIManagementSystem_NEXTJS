export interface JobPosition {
  id: number;
  name: string;
}

export interface EmployeeInforDto {
  id: string;
  fullName: string;
  email: string;
  departmentId?: number | null;
  department?: { id: number; name: string } | null;
  jobPositionId?: number | null;
  jobPosition?: JobPosition | null;
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
  systemCode?: string;
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
  startDate?: string | null;
  endDate?: string | null;
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
