// services/user-api.ts

import {
  EmployeeInforDto,
  JobPosition,
  DepartmentDto,
  ChangePasswordDto,
} from "../../../types/employee";

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

export const userApi = {
  async get(userId: string) {
    return request<EmployeeInforDto>(
      `/employeeinfor/infor/${encodeURIComponent(userId)}`
    );
  },

  async changePassword(
    userId: string | undefined,
    model: ChangePasswordDto
  ) {
    if (!userId) {
      throw new Error("USER_ID_REQUIRED");
    }

    return request<{
      success: boolean;
      message: string;
    }>(
      `/employeeinfor/password/${encodeURIComponent(userId)}`,
      {
        method: "POST",
        body: JSON.stringify(model),
      }
    );
  },
};