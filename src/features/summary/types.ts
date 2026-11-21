export type SummaryMode = "HrSummary" | "SummaryDirector";

export function isValidSummaryMode(value: string): value is SummaryMode {
  return value === "HrSummary" || value === "SummaryDirector";
}

export interface SummaryFilters {
  companyIds: string[];
  typeId: string;
  periodId: string;
  jobPositionId: string;
}

export interface SummaryRow {
  period: string;
  periodId: number;
  periodName: string;
  jobPosition: string;
  companyId: number;
  companyName: string;
  totalEval: number;
}

export interface SummaryDetail {
  evalId: number;
  userId: string;
  userName: string;
  jobName: string | null;
  departmentName: string | null;
  companyCode: string;
  companyName: string;
  periodName: string;
  templateCode: string;
  status: string;
  statusDisplay: string;
  isCanApprove: boolean;
  isReject: boolean;
  userDoing: string;
  note: string | null;
  score: number | null;
  managerSocre: number | null;
  rPercent: number | null;
  band: string | null;
  startDate: string;
  endDate: string;
}

export interface SummaryDetailFilters {
  status: string;
  keyword: string;
  companyId: string;
  departmentId: string;
}

export interface ReviewCustomUser {
  Id: number;
  UserId: string;
  SystemCode: string;
  JobTitle: string;
  CompanyId: number | null;
  DepartmentId: number | null;
}
