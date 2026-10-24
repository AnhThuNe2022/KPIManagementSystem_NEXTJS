export interface EvaluationDto {
  id: number;
  period?: string;
  templateName?: string;
  submitDate?: string | null;
  status: string;
  evalPeriodTemplateId: number;
}

export interface PagedRequest {
  page: number;
  pageSize: number;
  filters?: Record<string, string | undefined>;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export enum EvaluationStatus {
  Unknown = "Unknown",
  Drafted = "Drafted",
  Submitted = "Submitted",
  DirectManagerReviewing = "DirectManagerReviewing",
  ManagerMidReviewing = "ManagerMidReviewing",
  HRReviewing = "HRReviewing",
  ManagerSeniorReviewing = "ManagerSeniorReviewing",
  ChairManReviewing = "ChairManReviewing",
  Rejected = "Rejected",
  SentHR = "SentHR",
  CompileHRList = "CompileHRList",
  DirectorReviewCompileHRList = "DirectorReviewCompileHRList",
  CompileChiefOfStaffList = "CompileChiefOfStaffList",
  ChairManReviewCompile = "ChairManReviewCompile",
  DepartmentHeadReviewing = "DepartmentHeadReviewing",
  DirectorReviewing = "DirectorReviewing",
  Imported = "Imported",
  DeputyDirector = "DeputyDirector",
  DepartmentDirector = "DepartmentDirector",
  Over = "Over",
}

export enum UserRoleSystem {
  Admin = 1,
  ManagerMid,
  Employee,
  ManagerSenior,
  HR,
  ChairMan,
  DirectorSystem,
  ChiefOfStaff,
  DepartmentHead,
  HRSummary,
  Unknown,
}

export interface PendingEvaluationDto {
  id: number;
  userCode: string | null;
  userName: string | null;
  departmentName: string | null;
  periodLabel: string | null;
  submittedDate: string | null;
  selfScore: number | null;
  status: string;
  sysTemCode: string | null;
  stepId: number;
  isRejected: boolean;
  reason: string | null;
  companyCode: string | null;
}

export interface PendingEvaluationFilters {
  keyword: string;
  companyId: string;
  departmentId: string;
  periodId: string;
}

export interface EvaluationFilterOption {
  id: string;
  name: string;
}

export interface EvaluationTypeOption extends EvaluationFilterOption {
  periods: EvaluationFilterOption[];
}

export type ReviewRole = UserRoleSystem.ManagerMid | UserRoleSystem.HR;

export interface ReviewedEvaluationDto {
  id: number;
  employeeCode: string | null;
  employeeName: string | null;
  departmentName: string | null;
  periodLabel: string | null;
  status: string;
  approvedDate: string | null;
  approverName: string | null;
  rejectedReason: string | null;
  totalScore: number | null;
  managerSocre: number | null;
  band: string | null;
  evalid: number;
}

export interface ReviewedEvaluationFilters {
  keyword: string;
  companyId: string;
  departmentId: string;
  typeId: string;
  periodId: string;
  status: string;
  from: string;
  to: string;
  sortBy: string;
}

