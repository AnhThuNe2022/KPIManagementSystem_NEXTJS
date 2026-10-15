import { ConditionAssignmentDto } from "@/types/organization";
import { FilterString } from "@/types/employee";

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