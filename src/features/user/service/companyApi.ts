import { request } from "@/lib/api/request";
import {
  CompanyDto,
  FilterString,
} from "@/types/employee";


export const companyApi = {
  async getCompaniesByManager(
    filter?: FilterString
  ): Promise<CompanyDto[]> {
    return request<CompanyDto[]>(
      "/company/by-manager",
      {
        method: "POST",
        body: JSON.stringify(
          filter ?? { filters: {} }
        ),
      }
    );
  },
};