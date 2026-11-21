import { emitAppEvent, MENUS_CHANGED_EVENT } from "@/lib/events/appEvents";
import { request } from "@/lib/http/request";
import { unwrapApiData, type ApiResponse } from "@/server/api/types";
import type { MenuDraft, MenuDto } from "../types";

export const menuApi = {
  async my(signal?: AbortSignal): Promise<MenuDto[]> {
    const raw = await request<ApiResponse<MenuDto[] | null> | MenuDto[]>("/menus/my", { signal });
    const unwrapped = unwrapApiData(raw);
    return Array.isArray(unwrapped) ? unwrapped : [];
  },

  async tree(signal?: AbortSignal): Promise<MenuDto[]> {
    const raw = await request<MenuDto[] | ApiResponse<MenuDto[]>>("/menus/tree", { signal });
    const unwrapped = unwrapApiData(raw);
    return Array.isArray(unwrapped) ? unwrapped : [];
  },

  async save(draft: MenuDraft): Promise<void> {
    const payload = {
      Id: draft.id ?? 0,
      Code: draft.code.trim(),
      Title: draft.title.trim(),
      Url: draft.url.trim() || null,
      Icon: draft.icon.trim() || null,
      ParentId: draft.parentId,
      OrderNo: Number(draft.orderNo) || 0,
      IsActive: draft.isActive,
    };
    if (draft.id && draft.id > 0) {
      await request(`/menus/${draft.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await request("/menus", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    emitAppEvent(MENUS_CHANGED_EVENT);
  },

  async remove(id: number): Promise<void> {
    await request(`/menus/${id}`, { method: "DELETE" });
    emitAppEvent(MENUS_CHANGED_EVENT);
  },
};
