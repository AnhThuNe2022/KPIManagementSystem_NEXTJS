import { request } from "@/lib/http/request";
import type { PagedResult } from "@/server/api/types";
import type { AvailableManager, UserOrganizationDto } from "../types";

export type UserOrganizationUpsertItem = Omit<
  UserOrganizationDto,
  | "id"
  | "managerID"
  | "managerName"
  | "managerJobTitle"
  | "managerDepartmentName"
  | "managerCompanyName"
  | "managerOrganizationId"
> & {
  id?: number | null;
  managerID?: string | null;
  managerName?: string | null;
  managerJobTitle?: string | null;
  managerDepartmentName?: string | null;
  managerCompanyName?: string | null;
  managerOrganizationId?: number | null;
};

export const userOrganizationApi = {
  async getPaged(userId: string, signal?: AbortSignal): Promise<PagedResult<UserOrganizationDto>> {
    const data = await request<PagedResult<UserOrganizationDto>>("/userorganizations/get-page", {
      method: "POST",
      body: JSON.stringify({
        Filters: { userid: userId },
        Page: 1,
        Take: 1000,
      }),
      signal,
    });
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      total: Number(data?.total ?? 0),
    };
  },

  async getAvailableManagers(signal?: AbortSignal): Promise<AvailableManager[]> {
    const data = await request<PagedResult<AvailableManager>>("/userorganizations/get-page", {
      method: "POST",
      body: JSON.stringify({
        Page: 1,
        Take: 5000,
        Filters: { AvailableManager: "1" },
      }),
      signal,
    });
    return Array.isArray(data?.items) ? data.items : [];
  },

  async searchManagers(
    userId: string,
    keyword: string,
    signal?: AbortSignal,
  ): Promise<UserOrganizationDto[]> {
    const data = await request<PagedResult<UserOrganizationDto>>("/userorganizations/get-page", {
      method: "POST",
      body: JSON.stringify({
        Page: 1,
        Take: 20,
        Filters: { AvailableManager: userId, Keyword: keyword.trim() },
      }),
      signal,
    });
    const items = Array.isArray(data?.items) ? data.items : [];
    const seen = new Set<string>();
    const deduped: UserOrganizationDto[] = [];
    for (const item of items) {
      const key = String(item.userId ?? item.id ?? "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }
    return deduped;
  },

  async upsert(
    userId: string,
    assignments: Array<UserOrganizationDto | UserOrganizationUpsertItem>,
  ): Promise<{ success?: boolean; message?: string }> {
    const sanitized = assignments.map((item) => {
      const copy = { ...item };
      delete copy._localKey;
      return copy;
    });
    return request<{ success?: boolean; message?: string }>(
      `/userorganizations/upsert?userId=${encodeURIComponent(userId)}`,
      {
        method: "POST",
        body: JSON.stringify(sanitized),
      },
    );
  },
};
