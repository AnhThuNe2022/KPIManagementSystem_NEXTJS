import { emitAppEvent, MENUS_CHANGED_EVENT } from "@/lib/events/appEvents";
import { request } from "@/lib/http/request";
import type {
  PermissionAssignmentItem,
  PermissionAssignmentTab,
  PermissionDraft,
  PermissionDto,
  PermissionPage,
} from "../types";

export const permissionApi = {
  async list(
    page: number,
    pageSize: number,
    keyword: string,
    signal?: AbortSignal,
  ): Promise<PermissionPage<PermissionDto>> {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      "Filters[keyword]": keyword,
      "Filters[sortBy]": "Module",
      "Filters[sortOrder]": "asc",
    });
    const res = await request<PermissionPage<PermissionDto>>(`/permission?${query.toString()}`, {
      signal,
    });
    return {
      items: Array.isArray(res?.items) ? res.items : [],
      total: Number(res?.total ?? 0),
    };
  },

  async detail(permissionId: string, signal?: AbortSignal): Promise<PermissionDto> {
    return request<PermissionDto>(`/permission/${encodeURIComponent(permissionId)}`, { signal });
  },

  async save(draft: PermissionDraft, permissionId?: string): Promise<PermissionDto | void> {
    // Code is omitted on PUT per backend contract
    const body = {
      Name: draft.name.trim(),
      Module: draft.module.trim(),
      Description: draft.description,
      IsActive: draft.isActive,
      IsPublic: draft.isPublic,
      ...(!permissionId ? { Code: draft.code.trim() } : {}),
    };
    return request<PermissionDto | void>(
      `/permission${permissionId ? `/${encodeURIComponent(permissionId)}` : ""}`,
      {
        method: permissionId ? "PUT" : "POST",
        body: JSON.stringify(body),
      },
    );
  },

  async remove(permissionId: number): Promise<void> {
    await request(`/permission/${encodeURIComponent(String(permissionId))}`, {
      method: "DELETE",
    });
  },

  async assignments(
    permissionId: string,
    tab: PermissionAssignmentTab,
    search: string,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<PermissionPage<PermissionAssignmentItem>> {
    const query =
      tab === "users"
        ? new URLSearchParams({
            Page: String(page),
            PageSize: String(pageSize),
            "Filters[permissionId]": permissionId,
            "Filters[keyword]": search,
            "Filters[sortBy]": "IsAssigned",
            "Filters[sortOrder]": "desc",
          })
        : new URLSearchParams({ search });

    const res = await request<PermissionPage<Record<string, unknown>>>(
      `/permission/${encodeURIComponent(permissionId)}/${tab}?${query.toString()}`,
      { signal },
    );

    const items = Array.isArray(res?.items) ? res.items : [];
    return {
      total: Number(res?.total ?? items.length),
      items: items.map((item) => ({
        id: (item.id as number | string) ?? "",
        name: typeof item.name === "string" ? item.name : undefined,
        userName: typeof item.userName === "string" ? item.userName : undefined,
        systemCode: typeof item.systemCode === "string" ? item.systemCode : undefined,
        email: typeof item.email === "string" ? item.email : null,
        isAssigned: Boolean(
          item.isAssigned ??
            item.IsAssigned ??
            item.assigned ??
            item.isGranted ??
            item.isSelected ??
            item.isChecked ??
            false,
        ),
      })),
    };
  },

  async assign(
    permissionId: string,
    tab: PermissionAssignmentTab,
    targetId: number | string,
    assigned: boolean,
  ): Promise<void> {
    await request(
      `/permission/${encodeURIComponent(permissionId)}/${tab}/${encodeURIComponent(String(targetId))}`,
      { method: assigned ? "POST" : "DELETE" },
    );
    if (tab === "menus") {
      emitAppEvent(MENUS_CHANGED_EVENT);
    }
  },
};
