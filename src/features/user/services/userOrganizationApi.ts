import { request } from "@/lib/api/request";
import { UserOrganizationDto } from "@/features/user/types";

interface PagedResponse<T> {
  total: number;
  items: T[];
  page: number;
  pageSize: number;
}


export type AvailableManager = {
  id: string | number;
  userId?: string;
  userName: string;
  systemCode?: string;
  employeeCode?: string;
  jobTitle?: string;
  jobPositionName?: string;
  companyId?: number | null;
  companyName?: string;
  departmentId?: number | null;
  departmentName?: string;
};

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
  getAvailableManagers(signal?: AbortSignal) {
    return request<PagedResponse<AvailableManager>>("/userorganizations/get-page", {
      method: "POST",
      body: JSON.stringify({ Page: 1, Take: 5000, Filters: { AvailableManager: "1" } }),
      signal,
    });
  },
  /**
   * Load các đơn vị công tác của user
   */
async getPaged(userId: string, signal?: AbortSignal) {
  return request<{
    items: UserOrganizationDto[];
    total?: number;
    page?: number;
    pageSize?: number;
  }>("/userorganizations/get-page", {
    method: "POST",
    signal,
    body: JSON.stringify({
      Filters: {
        userid: userId,
      },
      Page: 1,
      Take: 1000,
    }),
  });
},

  /**
   * Search danh sách quản lý trực tiếp
   *
   * Dùng chính UserOrganization API,
   * không có API manager riêng.
   */
async searchManagers(
  userId: string,
  keyword: string
): Promise<PagedResponse<UserOrganizationDto>> {
  return request<PagedResponse<UserOrganizationDto>>(
    "/userorganizations/get-page",
    {
      method: "POST",
      body: JSON.stringify({
        Page: 1,
        Take: 5,
        Filters: {
          AvailableManager: userId,
          Keyword: keyword,
        },
      }),
    }
  );
},

  /**
   * Lưu toàn bộ danh sách đơn vị công tác
   */
async upsert(
  userId: string,
  assignments: UserOrganizationUpsertItem[]
) {
  return request<{
    success: boolean;
    message?: string;
  }>(
    `/userorganizations/upsert?userId=${encodeURIComponent(userId)}`,
    {
      method: "POST",
      body: JSON.stringify(assignments),
    }
  );
},
}
