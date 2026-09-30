import { UserOrganizationDto } from "@/types/organization";

interface PagedResponse<T> {
  total: number;
  items: T[];
  page: number;
  pageSize: number;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("UNAUTHORIZED");
    }

    throw new Error(`API_ERROR_${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const organizationApi = {
  /**
   * Load các đơn vị công tác của user
   */
async getPaged(userId: string) {
  return request<{
    items: UserOrganizationDto[];
    total?: number;
    page?: number;
    pageSize?: number;
  }>("/userorganizations/get-page", {
    method: "POST",
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
  assignments: UserOrganizationDto[]
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