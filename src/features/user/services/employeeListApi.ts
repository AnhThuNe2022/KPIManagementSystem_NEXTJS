import { companyApi } from "@/features/company/services/companyApi";
import { departmentApi } from "@/features/department/services/departmentApi";
import { downloadFile, request } from "@/lib/http/request";
import { unwrapApiData, type ApiResponse, type PagedResult } from "@/server/api/types";
import type {
  EmployeeListFilters,
  EmployeeListItemDto,
  JobPosition,
  RoleOption,
} from "../types";

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
    const raw = await request<JobPosition[] | ApiResponse<JobPosition[]>>("/jobposition", {
      signal,
    });
    const unwrapped = unwrapApiData(raw);
    return Array.isArray(unwrapped) ? unwrapped : [];
  },

  async getRoles(signal?: AbortSignal): Promise<RoleOption[]> {
    const raw = await request<RoleOption[] | ApiResponse<RoleOption[]>>("/role", { signal });
    const unwrapped = unwrapApiData(raw);
    return Array.isArray(unwrapped) ? unwrapped : [];
  },

  async getPaged(
    page: number,
    pageSize: number,
    filters: EmployeeListFilters,
    signal?: AbortSignal,
  ): Promise<PagedResult<EmployeeListItemDto>> {
    const raw = await request<
      PagedResult<EmployeeListItemDto> | ApiResponse<PagedResult<EmployeeListItemDto>>
    >("/employeeinfor/infor/paged", {
      method: "POST",
      body: JSON.stringify({
        Page: page,
        PageSize: pageSize,
        Filters: buildEmployeeFilters(filters),
      }),
      signal,
    });
    const unwrapped = unwrapApiData(raw);
    return {
      items: Array.isArray(unwrapped?.items) ? unwrapped.items : [],
      total: Number(unwrapped?.total ?? 0),
    };
  },

  exportEmployees(filters: EmployeeListFilters, signal?: AbortSignal): Promise<string> {
    return downloadFile("/export-file/employees", "danh-sach-nhan-vien.xlsx", {
      method: "POST",
      body: JSON.stringify(buildEmployeeFilters(filters)),
      signal,
    });
  },

  downloadTemplate(signal?: AbortSignal): Promise<string> {
    return downloadFile("/export-file/employee-template", "file-mau-nhan-vien.xlsx", {
      method: "GET",
      signal,
    });
  },
};
