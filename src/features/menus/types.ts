export interface MenuDto {
  id: number;
  code: string;
  title: string;
  url: string | null;
  icon: string | null;
  parentId: number | null;
  orderNo: number;
  isActive: boolean;
  children?: MenuDto[] | null;
}

export interface MenuDraft {
  id?: number;
  code: string;
  title: string;
  url: string;
  icon: string;
  parentId: number | null;
  orderNo: number;
  isActive: boolean;
}
