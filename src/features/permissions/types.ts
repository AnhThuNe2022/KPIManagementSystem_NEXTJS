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
