import { request } from "@/lib/api/request";
// services/user-api.ts

import {
  EmployeeInforDto,
  JobPosition,
  DepartmentDto,
  ChangePasswordDto,
} from "../../../types/employee";


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