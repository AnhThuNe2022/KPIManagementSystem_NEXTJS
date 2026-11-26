export interface LookupOption {
  id: string;
  name: string;
}

export interface TemplatePeriodLookupDto {
  id?: number;
  templateId: number;
  isActive?: boolean | null;
  name?: string | null;
}

export interface EvaluationPeriodLookupOption extends LookupOption {
  templatePeriodDtos?: TemplatePeriodLookupDto[];
}

export interface EvaluationTypeOption extends LookupOption {
  periods: EvaluationPeriodLookupOption[];
}

export interface EvaluationDto {
  id: number;
  userId?: string;
  name?: string | null;
  email?: string | null;
  status: string;
  templateId?: number | null;
  systemCode?: string | null;
  companyCode?: string | null;
  departmentName?: string | null;
  period?: string | null;
  templateName?: string | null;
  submitDate?: string | null;
  strDirectManager?: string | null;
  evalPeriodTemplateId?: number | null;
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
  typeId: string;
  periodId: string;
}

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
  evalid?: number;
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
}

export interface GeneralHrEvaluationDto {
  id: number;
  userId: string;
  name: string | null;
  email: string | null;
  status: string;
  templateId: number | null;
  systemCode: string | null;
  companyCode: string | null;
  departmentName: string | null;
  period: string | null;
  templateName: string | null;
  submitDate: string | null;
  strDirectManager: string | null;
  evalPeriodTemplateId?: number | null;
}

export interface GeneralHrFilters {
  keyword: string;
  companyId: string;
  departmentId: string;
  reviewerId: string;
  typeId: string;
  periodId: string;
  statuses: string[];
  sortOrder: "desc" | "asc";
}

export interface ApprovalHistoryEntry {
  approvalId?: number;
  approverName: string | null;
  approverUserId?: string | null;
  approvalLevel?: string | null;
  status?: string | null;
  statusValue?: string | null;
  comment?: string | null;
  createdAt?: string | null;
}

export interface EvaluationApprover {
  id: number;
  userName: string | null;
  systemCode?: string | null;
  status?: string | null;
  isApprove: boolean;
  approvalDate?: string | null;
  message?: string | null;
}

export interface TemplateStatusOption {
  status: number;
  stepStatus?: string | null;
  id?: string | null;
  name?: string | null;
}

export interface EvaluationTemplateDto {
  id: number;
  templateCode?: string | null;
  templateName: string;
}

export interface EvaluationPeriodTemplateDto {
  templateId: number;
  templateName: string;
}

export interface EvaluationPeriodDto {
  id: number;
  periodType: string | number;
  name: string;
  year: number | null;
  month: number | null;
  quarter: number | null;
  isActive: boolean | null;
  startDate: string | null;
  endDate: string | null;
  evaluationTypeId: number | null;
  templateId?: number | null;
  listTemplateId?: number[] | null;
  templatePeriodDtos?: EvaluationPeriodTemplateDto[] | null;
  statusPeriod?: string | number | null;
  createdAt?: string | null;
}
