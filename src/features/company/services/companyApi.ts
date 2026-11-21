import { request } from "@/lib/http/request";
import { unwrapApiData, type ApiResponse } from "@/server/api/types";
import type { CompanyDto } from "../types";

function asCompanyArray(raw: CompanyDto[] | ApiResponse<CompanyDto[]> | null): CompanyDto[] {
  const unwrapped = unwrapApiData(raw);
  return Array.isArray(unwrapped) ? unwrapped : [];
}

export const companyApi = {
  async getAll(signal?: AbortSignal): Promise<CompanyDto[]> {
    const raw = await request<CompanyDto[] | ApiResponse<CompanyDto[]>>("/company/all", { signal });
    return asCompanyArray(raw);
  },

  async getForHrCompile(signal?: AbortSignal): Promise<CompanyDto[]> {
    const raw = await request<CompanyDto[] | ApiResponse<CompanyDto[]>>("/company/by-manager", {
      method: "POST",
      body: JSON.stringify({ filters: { byunithrcompile: "1" } }),
      signal,
    });
    return asCompanyArray(raw);
  },

  async getCompaniesByManager(
    filter: Record<string, unknown> = { filters: {} },
    signal?: AbortSignal,
  ): Promise<CompanyDto[]> {
    const raw = await request<CompanyDto[] | ApiResponse<CompanyDto[]>>("/company/by-manager", {
      method: "POST",
      body: JSON.stringify(filter),
      signal,
    });
    return asCompanyArray(raw);
  },
};
