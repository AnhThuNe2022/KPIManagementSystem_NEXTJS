import { request } from "@/lib/api/request";

export type PermissionDraft = {
  code: string; name: string; module: string; description: string;
  isActive: boolean; isPublic: boolean;
};
export type Permission = PermissionDraft & { id: number; userCount: number; roleCount: number; menuCount: number };
export type AssignmentTab = "menus" | "roles" | "users";
export type Assignment =
  | { id: number | string; name: string; isAssigned: boolean }
  | { id: string; userName: string; systemCode: string; email: string | null; isAssigned: boolean };
export type PermissionPage<T> = { items: T[]; total: number };

export const permissionApi = {
  list(page: number, pageSize: number, keyword: string, signal?: AbortSignal) {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize), "Filters[keyword]": keyword, "Filters[sortBy]": "Module", "Filters[sortOrder]": "asc" });
    return request<PermissionPage<Permission>>("/permission?" + query, { signal });
  },
  detail(permissionId: string, signal?: AbortSignal) {
    return request<Permission>("/permission/" + encodeURIComponent(permissionId), { signal });
  },
  save(draft: PermissionDraft, permissionId?: string) {
    const body = { Name: draft.name.trim(), Module: draft.module.trim(), Description: draft.description, IsActive: draft.isActive, IsPublic: draft.isPublic, ...(!permissionId ? { Code: draft.code.trim() } : {}) };
    return request("/permission" + (permissionId ? "/" + encodeURIComponent(permissionId) : ""), { method: permissionId ? "PUT" : "POST", body: JSON.stringify(body) });
  },
  remove(permissionId: number) {
    return request("/permission/" + encodeURIComponent(permissionId), { method: "DELETE" });
  },
  assignments(permissionId: string, tab: AssignmentTab, search: string, page: number, pageSize: number, signal?: AbortSignal) {
    const query = tab === "users" ? new URLSearchParams({ Page: String(page), PageSize: String(pageSize), "Filters[keyword]": search, "Filters[sortBy]": "IsAssigned", "Filters[sortOrder]": "desc" }) : new URLSearchParams({ search });
    const endpoint = "/permission/" + encodeURIComponent(permissionId) + "/" + tab + "?" + query;
    return request<PermissionPage<Assignment>>(endpoint, { signal });
  },
  assign(permissionId: string, tab: AssignmentTab, targetId: number | string, assigned: boolean) {
    return request("/permission/" + encodeURIComponent(permissionId) + "/" + tab + "/" + encodeURIComponent(targetId), { method: assigned ? "POST" : "DELETE" });
  },
};

export function permissionError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code === "UNAUTHORIZED") return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (code === "FORBIDDEN" || code === "API_ERROR_403") return "Bạn chưa được cấp quyền thực hiện thao tác này.";
  if (code === "API_ERROR_404") return "Không tìm thấy quyền hoặc đối tượng được chọn. Hãy tải lại danh sách.";
  return "Chưa thể hoàn tất thao tác. Vui lòng thử lại; nếu vừa lưu, tải lại để kiểm tra trước khi gửi lần nữa.";
}
