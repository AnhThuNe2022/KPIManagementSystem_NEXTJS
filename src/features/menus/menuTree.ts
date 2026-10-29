import type { MenuDto } from "@/types/menu";

export type MenuRow = { menu: MenuDto; ancestors: MenuDto[] };

export function flattenMenus(menus: MenuDto[], ancestors: MenuDto[] = []): MenuRow[] {
  return [...menus].sort((a, b) => a.orderNo - b.orderNo).flatMap(menu => [
    { menu, ancestors }, ...flattenMenus(menu.children ?? [], [...ancestors, menu]),
  ]);
}

export function matchesMenu(menu: MenuDto, query: string) {
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLocaleLowerCase("vi");
  return normalize([menu.title, menu.code, menu.url].join(" ")).includes(normalize(query.trim()));
}
