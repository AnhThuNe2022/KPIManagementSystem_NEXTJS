export type SummaryMode = "HrSummary" | "SummaryDirector";

export type SummaryFilters = {
  companyIds: string[];
  typeId: string;
  periodId: string;
  jobPositionId: string;
};

export type SummaryRequest = {
  Page: number;
  PageSize: number;
  Filters: {
    typeScreen: "Summary";
    typeScreenRole: "HrSummary" | "Director";
    companyids: string;
    jobpositionid: string;
    kpievaluationtypeid: string | null;
    periodid: string | null;
  };
};

export type SummaryRow = {
  period: string;
  periodId: number;
  periodName: string;
  jobPosition: string;
  companyId: number;
  companyName: string;
  totalEval: number;
};

export type SummaryDetail = {
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
};

export type SummaryDetailFilters = {
  status: string;
  keyword: string;
  companyId: string;
  departmentId: string;
};
