/**
 * SINGLE ADAPTER LAYER isolating all backend .NET path typos, casing quirks,
 * and DTO oddities so feature code remains clean and maintainable.
 */
export const BACKEND_PATHS = {
  // Auth
  authLogin: "/auth/login",
  authForgotPassword: "/auth/forgot-password",
  authResetPassword: "/auth/reset-password",

  // Company
  companyAll: "/company/all",
  companyByManager: "/company/by-manager",

  // Department (mixed casing preserved for upstream .NET)
  departmentGetAll: "/department/get-all-department",
  departmentGetByFilter: "/department/get-by-filter",
  departmentCreate: "/Department/dto",
  departmentUpdate: "/Department/updatedto",
  departmentDelete: (id: string) => `/Department/${encodeURIComponent(id)}`,

  // Condition Assignments (mixed casing preserved)
  conditionGetAll: "/conditionassignments/get-all",
  conditionGetAllPaged: "/ConditionAssignments/get-all-paged",
  conditionCreate: "/ConditionAssignments",
  conditionById: (id: string) => `/ConditionAssignments/${encodeURIComponent(id)}`,
  conditionResponsibleHr: "/ConditionAssignments/responsible-hr",
  conditionDetailSync: "/ConditionAssignmentDetail/sync",

  // Employee Info (mixed casing preserved)
  employeeByFilter: "/employeeInfor/get-user-by-filter",
  employeeInforRoot: "/employeeinfor/infor",
  employeeInforPaged: "/employeeinfor/infor/paged",
  employeeInfor: (userId: string) => `/employeeinfor/infor/${encodeURIComponent(userId)}`,
  employeePassword: (userId: string) => `/employeeinfor/password/${encodeURIComponent(userId)}`,
  jobPosition: "/jobposition",
  role: "/role",

  // User Organizations
  userOrgGetPage: "/userorganizations/get-page",
  userOrgUpsert: (userId: string) => `/userorganizations/upsert?userId=${encodeURIComponent(userId)}`,

  // Evaluations (backend typos "evaualtion" & "Evalaution" isolated strictly here)
  evaluationGetPage: "/KPIEvaluation/evaualtion/get-page",
  evaluationPending: "/KPIEvaluation/pending",
  evaluationReviewed: "/KPIEvaluation/reviewed",
  evaluationStatuses: "/TemplateLevel/get-all-status",
  evaluationChangeStatus: "/KPIEvaluation/ChangeStatusEval",
  evaluationReviewAction: (id: string) => `/KPIEvaluation/review-action/${encodeURIComponent(id)}`,
  evaluationReviewActionMany: "/KPIEvaluation/review-action-many",
  evaluationById: (id: string) => `/KPIEvaluation/${encodeURIComponent(id)}`,
  evaluationApprovalFilter: "/KPIEvaluationApproval/filter",
  evaluationSteps: (id: string) => `/KPIEvaluation/GetListSteps/${encodeURIComponent(id)}`,
  evaluationDefByIds: "/KPIEvaluation/GetListEvalautionAndDefByIds",

  // Export File
  exportEvaluationZip: "/ExportFile/ExportEvaluationZip",
  exportListEvaluation: "/ExportFile/ExportListEvaluation",
  exportSummaryEvaluation: "/ExportFile/ExportSummaryEvaluation",
  exportEmployees: "/ExportFile/ExportEmployee",
  exportEmployeeTemplate: "/ExportFile/download-template",

  // KPI Periods, Types, Templates (trailing slash on update-period/ preserved)
  periodCreate: "/kpi-evaluation-periods/create",
  periodUpdate: "/kpi-evaluation-periods/update-period/",
  periodDelete: (id: string) => `/kpi-evaluation-periods/delete/${encodeURIComponent(id)}`,
  periodGetById: (id: string) => `/kpi-evaluation-periods/get-by-id/${encodeURIComponent(id)}`,
  periodGetAll: "/kpi-evaluation-periods/get-all",
  periodGetPage: "/kpi-evaluation-periods/get-page",
  evaluationTypesGetAll: "/kpi-evaluation-types/get-all",
  kpiTemplateList: "/KPITemplate",

  // Menus
  menusMy: "/menus/my",
  menusTree: "/menus/tree",
  menusRoot: "/menus",
  menusById: (id: string) => `/menus/${encodeURIComponent(id)}`,

  // Notifications (mixed casing preserved)
  notificationsRoot: "/Notifications",
  notificationsAll: "/Notifications/all",
  notificationsMarkRead: (id: string) => `/Notifications/mark-read/${encodeURIComponent(id)}`,
  notificationsMarkAllRead: "/Notifications/mark-all-read",
  notificationsById: (id: string) => `/Notifications/${encodeURIComponent(id)}`,
  notificationsSendMessage: "/notifications/sendMessage",

  // Permissions
  permissionPath: (segments: string[]) =>
    segments.length ? `/permission/${segments.map(encodeURIComponent).join("/")}` : "/permission",

  // Summary
  summaryCompile: "/KPIEvaluation/compileEvaluation",
  summaryDetail: "/KPIEvaluation/compileEvaluationDetail",
} as const;

export const POSITIVE_INT_ID_RE = /^[1-9]\d*$/;
export const PERMISSION_SEGMENT_RE = /^[a-zA-Z0-9_.@-]+$/;

/** Maps numeric rolePage from FE to upstream string expected by /KPIEvaluation/reviewed. */
export function mapReviewedRolePage(raw: string | null): string | null {
  if (!raw) return null;
  if (raw === "5" || raw.toUpperCase() === "HR") return "HR";
  if (raw === "2" || raw === "ManagerMid") return "ManagerMid";
  return raw;
}
