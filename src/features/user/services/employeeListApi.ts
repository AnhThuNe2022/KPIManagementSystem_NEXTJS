import { downloadFile, request } from "@/lib/api/request";
import { companyApi } from "@/features/company/services/companyApi";
import { departmentApi } from "@/features/department/services/departmentApi";
import { isTechnicalError, requestMessage } from "@/features/evaluation/evaluationDisplay";
import type {
  EmployeeListFilters,
  EmployeeListItemDto,
  JobPosition,
  RoleOption,
} from "@/features/user/types";
import type { PagedResult } from "@/lib/api/types";

export function employeeErrorMessage(cause: unknown, fallback: string): string {
  if (!(cause instanceof Error)) return fallback;
  const raw = cause.message.trim();
  if (!raw || raw === "API_OPERATION_FAILED" || raw === "UNAUTHORIZED" || raw === "FORBIDDEN" || isTechnicalError(raw)) {
    return requestMessage(cause, fallback);
  }
  return raw;
}

function buildEmployeeFilters(filters: EmployeeListFilters) {
  return {
    keyword: filters.keyword.trim(),
    departmentId: filters.departmentId || null,
    jobId: filters.jobId || null,
    sortOrder: filters.sortOrder,
    sortBy: "FullName",
    roleId: filters.roleId || null,
    companyId: filters.companyId || null,
    missingInfo: filters.missingInfo,
  };
}

export const employeeListApi = {
  getCompanies(signal?: AbortSignal) {
    return companyApi.getForHrCompile(signal);
  },

  getDepartments(companyId: string, signal?: AbortSignal) {
    return departmentApi.getAll(companyId, { byScope: true, signal });
  },

  async getJobPositions(signal?: AbortSignal): Promise<JobPosition[]> {
    const response = await request<JobPosition[] | { data: JobPosition[] }>("/jobposition", { signal });
    return Array.isArray(response) ? response : response.data;
  },

  async getRoles(signal?: AbortSignal): Promise<RoleOption[]> {
    const response = await request<RoleOption[] | { data: RoleOption[] }>("/role", { signal });
    return Array.isArray(response) ? response : response.data;
  },

  async getPaged(
    page: number,
    pageSize: number,
    filters: EmployeeListFilters,
    signal?: AbortSignal,
  ): Promise<PagedResult<EmployeeListItemDto>> {
    const response = await request<
      PagedResult<EmployeeListItemDto> | { data: PagedResult<EmployeeListItemDto> }
    >("/employeeinfor/infor/paged", {
      method: "POST",
      body: JSON.stringify({
        Page: page,
        PageSize: pageSize,
        Filters: buildEmployeeFilters(filters),
      }),
      signal,
    });
    return "items" in response ? response : response.data;
  },

  exportEmployees(filters: EmployeeListFilters, signal?: AbortSignal) {
    return downloadFile(
      "/export-file/employees",
      {
        method: "POST",
        body: JSON.stringify(buildEmployeeFilters(filters)),
        signal,
      },
      "danh-sach-nhan-vien.xlsx",
    );
  },

  downloadTemplate(signal?: AbortSignal) {
    return downloadFile(
      "/export-file/employee-template",
      { method: "GET", signal },
      "file-mau-nhan-vien.xlsx",
    );
  },
};
