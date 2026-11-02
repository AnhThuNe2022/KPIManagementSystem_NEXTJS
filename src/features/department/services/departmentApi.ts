import { request } from "@/lib/api/request";
import { DepartmentDto } from "@/features/department/types";


export const departmentApi = {
  async getAll(companyId?: number | string, options: { byScope?: boolean; signal?: AbortSignal } = {}) {
    const params = new URLSearchParams();

    if (companyId) {
      params.set(
        "Filters[companyid]",
        String(companyId)
      );
    }

    if (options.byScope) params.set("byscope", "true");

    const query = params.toString();

    return request<DepartmentDto[]>(
      `/department/get-all-department${query ? `?${query}` : ""}`,
      { signal: options.signal }
    );
  },
};
