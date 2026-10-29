import { request } from "@/lib/api/request";
import type { MenuDto } from "@/types/menu";

export type MenuDraft = Omit<MenuDto, "children">;
export const MENUS_CHANGED = "menus-changed";

export const menuApi = {
  async my(signal?: AbortSignal) {
    const response = await request<{ data: MenuDto[] | null }>("/menus/my", { signal });
    return response.data ?? [];
  },
  tree(signal?: AbortSignal) {
    return request<MenuDto[]>("/menus/tree", { signal });
  },
  save(menu: MenuDraft) {
    return request("/menus" + (menu.id ? "/" + menu.id : ""), {
      method: menu.id ? "PUT" : "POST",
      body: JSON.stringify({
        Id: menu.id, Code: menu.code.trim(), Title: menu.title.trim(),
        Url: menu.url?.trim() || null, Icon: menu.icon || null,
        ParentId: menu.parentId ?? null, OrderNo: menu.orderNo, IsActive: menu.isActive,
      }),
    });
  },
  remove(id: number) {
    return request("/menus/" + id, { method: "DELETE" });
  },
};
