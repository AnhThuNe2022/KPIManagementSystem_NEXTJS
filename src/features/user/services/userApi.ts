import { request } from "@/lib/http/request";
import type { ChangePasswordDto, EmployeeInforDto } from "../types";

export interface CreateEmployeeRequest {
  FullName: string;
  UserName: string;
  Email: string;
  Password: string;
  JobPositionId: number;
  DepartmentId: number;
  roles: string[];
  SystemCode: string;
  EmployeeCode: string;
  JobTitle: string;
  CompanyId: number;
}

export interface UpdateEmployeeRequest {
  FullName: string;
  UserName: string;
  JobPositionId: number;
  Email: string;
  SystemCode: string;
  roles: string[];
}

type CreateEmployeeResponse =
  | string
  | { id?: string; userId?: string; data?: string | { id?: string; userId?: string } };

export const userApi = {
  async get(userId: string, signal?: AbortSignal): Promise<EmployeeInforDto> {
    return request<EmployeeInforDto>(`/employeeinfor/infor/${encodeURIComponent(userId)}`, {
      signal,
    });
  },

  async create(body: CreateEmployeeRequest): Promise<string> {
    const res = await request<CreateEmployeeResponse>("/employeeinfor/infor", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const raw =
      typeof res === "string"
        ? res
        : typeof res?.data === "string"
          ? res.data
          : res?.userId ?? res?.id ?? res?.data?.userId ?? res?.data?.id ?? "";
    return String(raw).trim();
  },

  async update(userId: string, body: UpdateEmployeeRequest): Promise<void> {
    await request(`/employeeinfor/infor/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  async remove(userId: string): Promise<void> {
    await request(`/employeeinfor/infor/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
  },

  async adminResetPassword(
    userId: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<void> {
    await request(`/employeeinfor/password/${encodeURIComponent(userId)}`, {
      method: "POST",
      body: JSON.stringify({
        CurrentPassword: null,
        NewPassword: newPassword,
        ConfirmPassword: confirmPassword,
        isAdmin: true,
      }),
    });
  },

  async changePassword(
    userId: string | undefined,
    payload: ChangePasswordDto,
  ): Promise<{ success?: boolean; ok?: boolean; message?: string }> {
    if (!userId) throw new Error("USER_ID_REQUIRED");
    return request<{ success?: boolean; ok?: boolean; message?: string }>(
      `/employeeinfor/password/${encodeURIComponent(userId)}`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
};
