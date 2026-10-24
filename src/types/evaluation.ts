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

export const generalHrStatusOptions = [
  { value: EvaluationStatus.Unknown, label: "Không xác định" },
  { value: EvaluationStatus.Drafted, label: "Lưu nháp" },
  { value: EvaluationStatus.Rejected, label: "Bị từ chối" },
  { value: EvaluationStatus.DirectManagerReviewing, label: "Quản lý trực tiếp đang duyệt" },
  { value: EvaluationStatus.HRReviewing, label: "HR đang duyệt" },
  { value: EvaluationStatus.CompileHRList, label: "Đã đánh giá xong" },
  { value: EvaluationStatus.ManagerSeniorReviewing, label: "Quản lý cấp cao đang duyệt" },
  { value: EvaluationStatus.SentHR, label: "QLCC đã duyệt" },
  { value: EvaluationStatus.Imported, label: "Đã được import" },
] as const;

export interface GeneralHrEvaluationRequest {
  Page: number;
  PageSize: number;
  Filters: {
    keyword?: string;
    departmentid?: string;
    status: string;
    companyid?: string;
    evaluationtypeid?: string;
    periodid?: string;
    userapprove?: string;
    sortOrder?: "asc" | "desc";
    sortBy?: string;
  };
}

export interface GeneralHrStatusChange {
  EvalId: number;
  Status: number;
  Reason?: string | null;
}

export interface GeneralHrEvaluationDto {
  id: number;
  userId: string;
  name: string;
  status: string;
  templateId?: number | null;
  systemCode?: string | null;
  companyCode?: string | null;
  departmentName?: string | null;
  period?: string | null;
  templateName?: string | null;
  submitDate?: string | null;
  strDirectManager?: string | null;
}

export interface ApprovalHistoryEntry {
  approvalId: number;
  approverName?: string | null;
  approverUserId?: string | null;
  approvalLevel?: string | null;
  status: string;
  statusValue?: string | null;
  comment?: string | null;
  createdAt: string;
}

export interface EvaluationApprover {
  id: number;
  userName: string;
  userId?: string | null;
  systemCode?: string | null;
  status: string;
  isApprove: boolean;
  approvalDate?: string | null;
  message?: string | null;
}
