import { DepartmentDto } from "@/types/employee";

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