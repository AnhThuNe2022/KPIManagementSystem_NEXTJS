export type MenuDto = {
  id: number;
  code: string;
  title: string;
  url?: string | null;
  icon?: string | null;
  parentId?: number | null;
  orderNo: number;
  isActive: boolean;
  children: MenuDto[];
};

export type MenuFlatDto = {
  id: number;
  title: string;
  level: number;
  parentId?: number | null;
};