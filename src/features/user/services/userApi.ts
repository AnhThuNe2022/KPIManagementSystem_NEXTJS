import { request } from "@/lib/http/request";
import type { ChangePasswordDto, EmployeeInforDto } from "../types";

export const userApi = {
  async get(userId: string, signal?: AbortSignal): Promise<EmployeeInforDto> {
    return request<EmployeeInforDto>(`/employeeinfor/infor/${encodeURIComponent(userId)}`, {
      signal,
    });
  },

  async changePassword(
    userId: string,
    payload: ChangePasswordDto,
  ): Promise<{ success?: boolean; ok?: boolean; message?: string }> {
    return request<{ success?: boolean; ok?: boolean; message?: string }>(
      `/employeeinfor/password/${encodeURIComponent(userId)}`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
};
