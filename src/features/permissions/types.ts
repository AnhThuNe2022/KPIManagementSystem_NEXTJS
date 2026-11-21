export interface PermissionDraft {
  code: string;
  name: string;
  module: string;
  description: string;
  isActive: boolean;
  isPublic: boolean;
}

export interface PermissionDto extends PermissionDraft {
  id: number;
  userCount: number;
  roleCount: number;
  menuCount: number;
}

export type PermissionAssignmentTab = "menus" | "roles" | "users";
export type PermissionInspectorTab = "detail" | PermissionAssignmentTab;

export interface PermissionAssignmentItem {
  id: number | string;
  name?: string;
  userName?: string;
  systemCode?: string;
  email?: string | null;
  isAssigned: boolean;
}

export interface PermissionPage<T> {
  items: T[];
  total: number;
}
