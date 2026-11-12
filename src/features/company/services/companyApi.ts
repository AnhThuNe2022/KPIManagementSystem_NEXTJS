import { request } from "@/lib/api/request";
import {
  CompanyDto,
} from "@/features/company/types";
import {
  FilterString,
} from "@/lib/api/types";


export const companyApi = {
  async getForHrCompile(signal?: AbortSignal) {
    const response = await request<CompanyDto[] | { data: CompanyDto[] }>("/company/by-manager", {
      method: "POST", body: JSON.stringify({ filters: { byunithrcompile: "1" } }), signal,
    });
    return Array.isArray(response) ? response : response.data;
  },
  async getCompaniesByManager(
    filter?: FilterString,
    signal?: AbortSignal
  ): Promise<CompanyDto[]> {
    return request<CompanyDto[]>(
      "/company/by-manager",
      {
        method: "POST",
        body: JSON.stringify(
          filter ?? { filters: {} }
        ),
        signal,
      }
    );
  },
  getAll(signal?: AbortSignal) {
    return request<CompanyDto[]>("/company/all", { signal }
    );
  },
};
