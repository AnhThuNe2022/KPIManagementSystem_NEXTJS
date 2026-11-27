export type MenuDto = {
  id: number;
  code: string;
  title: string;
  url?: string | null;
  icon?: string | null;
  parentId?: number | null;
  orderNo: number;
  isActive: boolean;
  workspaceId?: number | null;
  workspaceName?: string | null;
  children: MenuDto[];
};

export type MenuDraft = Omit<MenuDto, "children">;
