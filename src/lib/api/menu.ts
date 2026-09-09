import type { MenuDto } from "@/types/menu";
import type { ApiResponse } from "@/types/types";
import { apiClient } from "@/lib/api/client";

export async function getMenus(): Promise<MenuDto[]> {
  const response = await apiClient<ApiResponse<MenuDto[]>>("/menus/my", {
    method: "GET",
  });
  console.log("API Response 4545454545459999:", response);
  return response.data ?? [];
}