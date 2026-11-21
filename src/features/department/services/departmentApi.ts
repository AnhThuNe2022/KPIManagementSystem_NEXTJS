import { request } from "@/lib/http/request";
import { unwrapApiData, type ApiResponse } from "@/server/api/types";
import type { DepartmentDraft, DepartmentDto } from "../types";

function asDepartmentArray(raw: DepartmentDto[] | ApiResponse<DepartmentDto[]> | null): DepartmentDto[] {
  const unwrapped = unwrapApiData(raw);
  return Array.isArray(unwrapped) ? unwrapped : [];
}

export const departmentApi = {
  async getAll(companyId: string | number, options?: { byScope?: boolean; signal?: AbortSignal }): Promise<DepartmentDto[]> {
    const query = new URLSearchParams();
    if (String(companyId ?? "").trim()) {
      query.set("Filters[companyid]", String(companyId).trim());
    }
    if (options?.byScope) {
      query.set("byscope", "true");
    }
    const raw = await request<DepartmentDto[] | ApiResponse<DepartmentDto[]>>(
      `/department/get-all-department?${query.toString()}`,
      { signal: options?.signal },
    );
    return asDepartmentArray(raw);
  },

  async list(
    companyId = "",
    name = "",
    options?: { byUnitHrCompile?: boolean; signal?: AbortSignal },
  ): Promise<DepartmentDto[]> {
    const query = new URLSearchParams();
    if (companyId.trim()) query.set("companyid", companyId.trim());
    if (name.trim()) query.set("name", name.trim());
    if (options?.byUnitHrCompile === false) query.set("byunithrcompile", "false");
    const raw = await request<DepartmentDto[] | ApiResponse<DepartmentDto[]>>(
      `/departments?${query.toString()}`,
      { signal: options?.signal },
    );
    return asDepartmentArray(raw);
  },

  async save(draft: DepartmentDraft): Promise<void> {
    const payload = {
      Id: draft.id,
      Name: draft.name.trim(),
      Description: draft.description.trim(),
      CompanyId: draft.companyId,
      IsActive: draft.isActive,
    };
    await request("/departments", {
      method: draft.id > 0 ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
  },

  async remove(id: number): Promise<void> {
    await request(`/departments?id=${encodeURIComponent(String(id))}`, { method: "DELETE" });
  },
};
