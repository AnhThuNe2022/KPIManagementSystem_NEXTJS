import { request } from "@/lib/http/request";
import { unwrapApiData, type ApiResponse, type PagedResult } from "@/server/api/types";
import type {
  ConditionAssignmentDraft,
  ConditionAssignmentDto,
  ConditionAssignmentFilterState,
  ConditionAssignmentUserOption,
} from "../types";

export const conditionAssignmentApi = {
  async getAll(
    filters: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<ConditionAssignmentDto[]> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value.trim()) query.set(`Filters[${key}]`, value.trim());
    }
    const raw = await request<
      ConditionAssignmentDto[] | ApiResponse<ConditionAssignmentDto[]>
    >(`/conditionassignments/get-all?${query.toString()}`, { signal });
    const unwrapped = unwrapApiData(raw);
    return Array.isArray(unwrapped) ? unwrapped : [];
  },

  async getPage(params: {
    page: number;
    pageSize: number;
    filters: ConditionAssignmentFilterState;
    signal?: AbortSignal;
  }): Promise<PagedResult<ConditionAssignmentDto>> {
    const { page, pageSize, filters, signal } = params;
    const idValue =
      filters.scopeType === "2"
        ? filters.departmentId
        : filters.companyId;

    const payload = {
      Keyword: filters.keyword.trim() || undefined,
      Page: page,
      Take: pageSize,
      Filters: {
        scopetype: filters.scopeType || undefined,
        idvalue: idValue || undefined,
        isactive: filters.isActive || undefined,
        userid: filters.userId || undefined,
        statuscondition: filters.statusCondition || undefined,
      },
    };

    const raw = await request<
      PagedResult<ConditionAssignmentDto> | ApiResponse<PagedResult<ConditionAssignmentDto>>
    >("/conditionassignments/get-all-paged", {
      method: "POST",
      body: JSON.stringify(payload),
      signal,
    });
    const unwrapped = unwrapApiData(raw);
    return {
      items: Array.isArray(unwrapped?.items) ? unwrapped.items : [],
      total: Number(unwrapped?.total ?? 0),
    };
  },

  async getUsers(screenFilter = false, signal?: AbortSignal): Promise<ConditionAssignmentUserOption[]> {
    const endpoint = screenFilter
      ? "/employeeinfor/get-user-by-filter?condition-assignments-screen=true"
      : "/employeeinfor/get-user-by-filter";
    const raw = await request<
      Array<{ id: string; fullName?: string | null; systemCode?: string | null }> |
      ApiResponse<Array<{ id: string; fullName?: string | null; systemCode?: string | null }>>
    >(endpoint, { signal });
    const unwrapped = unwrapApiData(raw);
    if (!Array.isArray(unwrapped)) return [];
    return unwrapped.map((u) => ({
      id: String(u.id),
      fullName: u.fullName?.trim() || String(u.id),
      systemCode: u.systemCode ?? null,
    }));
  },

  async save(draft: ConditionAssignmentDraft): Promise<void> {
    if (draft.id && draft.id > 0) {
      await request(`/conditionassignments/${draft.id}`, {
        method: "PUT",
        body: JSON.stringify({
          Id: draft.id,
          StatusCondition: draft.statusCondition,
          ScopeType: draft.scopeType,
          IdValue: draft.idValue,
          UserId: draft.userId,
          IsActive: draft.isActive,
          Description: draft.description.trim() || null,
        }),
      });
      return;
    }

    await request("/conditionassignments", {
      method: "POST",
      body: JSON.stringify({
        StatusCondition: draft.statusCondition,
        IdValue: draft.idValue,
        UserId: draft.userId,
        FullName: draft.fullName,
        SystemCodeUser: draft.systemCodeUser,
        IsActive: draft.isActive,
        ScopeType: draft.scopeType,
      }),
    });
  },

  async remove(id: number): Promise<void> {
    await request(`/conditionassignments/${id}`, { method: "DELETE" });
  },
};
