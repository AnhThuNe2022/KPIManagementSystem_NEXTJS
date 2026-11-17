import { request } from "@/lib/api/request";
import { DepartmentDto } from "@/features/department/types";


export type Department = DepartmentDto & { companyId: number };
export type DepartmentDraft = Pick<Department, "name" | "description" | "companyId" | "isActive">;

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
  async list(companyId: string, name: string, signal?: AbortSignal) {
    const query = new URLSearchParams({ byunithrcompile: "true", companyid: companyId, name });
    const response = await request<Department[] | { data: Department[] }>("/departments?" + query, { signal });
    return Array.isArray(response) ? response : response.data;
  },
  save(draft: DepartmentDraft, id = 0) {
    return request("/departments", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify({ Id: id, Name: draft.name.trim(), Description: draft.description, CompanyId: draft.companyId, IsActive: draft.isActive }),
    });
  },
  remove(id: number) {
    return request("/departments?id=" + id, { method: "DELETE" });
  },
};
