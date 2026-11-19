import { request } from "@/lib/api/request";
import {
  AssignmentScopeType,
  type ConditionAssignmentDraft,
  type ConditionAssignmentDto,
  type ConditionAssignmentFilters,
} from "@/features/condition-assignments/types";
import type { ApiResponse, FilterString, PagedResult } from "@/lib/api/types";

export interface ConditionAssigneeOption {
  id: string;
  fullName: string;
  systemCode?: string;
}

export const conditionAssignmentApi = {
  async getAll(filter: FilterString, signal?: AbortSignal): Promise<ConditionAssignmentDto[]> {
    const params = new URLSearchParams();

    Object.entries(filter.filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.append(`Filters[${key}]`, value);
      }
    });

    const query = params.toString();
    const result = await request<ConditionAssignmentDto[] | { data?: ConditionAssignmentDto[] }>(
      query ? `/conditionassignments/get-all?${query}` : "/conditionassignments/get-all",
      { signal },
    );
    return Array.isArray(result) ? result : result?.data ?? [];
  },

  async getPage(
    page: number,
    pageSize: number,
    filters: ConditionAssignmentFilters,
    signal?: AbortSignal,
  ): Promise<PagedResult<ConditionAssignmentDto>> {
    const idValue =
      filters.scopeType === String(AssignmentScopeType.Department)
        ? filters.departmentId
        : filters.departmentId || filters.companyId;

    const response = await request<
      PagedResult<ConditionAssignmentDto> | ApiResponse<PagedResult<ConditionAssignmentDto>>
    >("/conditionassignments/get-all-paged", {
      method: "POST",
      body: JSON.stringify({
        Keyword: filters.keyword.trim(),
        Page: page,
        Take: pageSize,
        Filters: {
          scopetype: filters.scopeType,
          idvalue: idValue,
          isactive: filters.isActive,
          userid: filters.userId,
          statuscondition: filters.statusCondition,
        },
      }),
      signal,
    });

    const data = "items" in response ? response : response.data;
    if (!data) throw new Error("MISSING_CONDITION_ASSIGNMENT_LIST");
    return data;
  },

  async getUsers(screenFilter = false, signal?: AbortSignal): Promise<ConditionAssigneeOption[]> {
    const endpoint = screenFilter
      ? "/employeeinfor/get-user-by-filter?condition-assignments-screen=true"
      : "/employeeinfor/get-user-by-filter";
    const response = await request<
      | Array<{ id: string; fullName?: string; systemCode?: string }>
      | { data?: Array<{ id: string; fullName?: string; systemCode?: string }> }
    >(endpoint, { signal });
    const rows = Array.isArray(response) ? response : response?.data ?? [];
    return rows
      .filter((row) => row && row.id)
      .map((row) => ({
        id: String(row.id),
        fullName: row.fullName?.trim() || String(row.id),
        systemCode: row.systemCode?.trim(),
      }));
  },

  async save(draft: ConditionAssignmentDraft, id?: number | string | null): Promise<void> {
    const numericId = id != null && /^\d+$/.test(String(id).trim()) ? Number(id) : id;
    const idValue = draft.idValue.trim();

    if (id != null && String(id).trim() !== "") {
      await request(`/conditionassignments/${encodeURIComponent(String(id))}`, {
        method: "PUT",
        body: JSON.stringify({
          Id: numericId,
          StatusCondition: draft.statusCondition,
          ScopeType: draft.scopeType,
          IdValue: idValue,
          UserId: draft.userId,
          IsActive: draft.isActive,
          Description: draft.description,
        }),
      });
      return;
    }

    await request("/conditionassignments", {
      method: "POST",
      body: JSON.stringify({
        StatusCondition: draft.statusCondition,
        IdValue: idValue,
        UserId: draft.userId,
        FullName: draft.fullName,
        SystemCodeUser: draft.systemCodeUser,
        IsActive: draft.isActive,
        ScopeType: draft.scopeType,
      }),
    });
  },

  async remove(id: number | string): Promise<void> {
    await request(`/conditionassignments/${encodeURIComponent(String(id))}`, {
      method: "DELETE",
    });
  },
};
