import { request } from "@/lib/api/request";
import { ConditionAssignmentDto } from "@/types/organization";
import { FilterString } from "@/types/employee";


export const conditionApi = {
  async getAll(
    filter: FilterString
  ): Promise<ConditionAssignmentDto[]> {
    const params = new URLSearchParams();

    Object.entries(filter.filters).forEach(
      ([key, value]) => {
        if (
          value !== null &&
          value !== undefined
        ) {
          params.append(`Filters[${key}]`, value);
        }
      }
    );

    console.log("condition filter =", filter);
    console.log("condition params =", params.toString());

    return request<ConditionAssignmentDto[]>(
      `/conditionassignments/get-all?${params.toString()}`
    );
  },
};