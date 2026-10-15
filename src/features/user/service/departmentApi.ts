import { request } from "@/lib/api/request";
import { DepartmentDto } from "@/types/employee";


export const departmentApi = {
  async getAll(companyId?: number) {
    const params = new URLSearchParams();

    if (companyId) {
      params.set(
        "Filters[companyid]",
        String(companyId)
      );
    }

    const query = params.toString();

    return request<DepartmentDto[]>(
      `/department/get-all-department${query ? `?${query}` : ""}`
    );
  },
};