import { normalizeVietnamese } from "@/lib/format/formatters";
import { resolveInternalLink } from "@/lib/security/redirect";
import type { MenuDto } from "./types";

export const LEGACY_ROUTE_MAP: Record<string, string> = {
  "/user/infor": "/user-infor",
  "/my/evaluation": "/my-evaluation",
  "/permissions": "/admin/permission",
  "/menus": "/admin/menu",
};

export const OPEN_ROUTES = ["/dashboard", "/user-infor", "/my-evaluation", "/notifications"] as const;

export const ROUTE_PARENT_PREFIXES: Array<{ prefix: string; parent: string }> = [
  { prefix: "/summary/summary-list-detail/hrsummary", parent: "/summary/summary-list/hrsummary" },
  {
    prefix: "/summary/summary-list-detail/summarydirector",
    parent: "/summary/summary-list/summarydirector",
  },
];

export function normalizeMenuHref(url: string | null | undefined): string {
  const internal = resolveInternalLink(url);
  if (!internal) return "#";
  try {
    const parsed = new URL(internal, "http://internal.local");
    const lowerPath = parsed.pathname.replace(/\/+$/, "").toLowerCase() || "/";
    const mappedPath = LEGACY_ROUTE_MAP[lowerPath] ?? (parsed.pathname.replace(/\/+$/, "") || "/");
    return `${mappedPath}${parsed.search}${parsed.hash}`;
  } catch {
    return "#";
  }
}

export function normalizeRouteKey(url: string | null | undefined): string | null {
  const href = normalizeMenuHref(url);
  if (href === "#") return null;
  try {
    const parsed = new URL(href, "http://internal.local");
    return (parsed.pathname.replace(/\/+$/, "") || "/").toLowerCase();
  } catch {
    return null;
  }
}

export function sortMenuTree(items: MenuDto[]): MenuDto[] {
  return [...items]
    .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0) || a.id - b.id)
    .map((item) => ({
      ...item,
      children: Array.isArray(item.children) ? sortMenuTree(item.children) : [],
    }));
}

export function collectAllowedRouteKeys(items: MenuDto[]): Set<string> {
  const keys = new Set<string>();
  const walk = (nodes: MenuDto[]) => {
    for (const node of nodes) {
      if (node.isActive !== false) {
        const key = normalizeRouteKey(node.url);
        if (key) keys.add(key);
        if (Array.isArray(node.children) && node.children.length > 0) {
          walk(node.children);
        }
      }
    }
  };
  walk(items);
  return keys;
}

export function isOpenRoute(pathname: string): boolean {
  const normalized = (pathname.replace(/\/+$/, "") || "/").toLowerCase();
  return OPEN_ROUTES.some((route) => normalized === route || normalized.startsWith(`${route}/`));
}

export function isPathnameAllowed(pathname: string, allowedKeys: Set<string>): boolean {
  const normalized = (pathname.replace(/\/+$/, "") || "/").toLowerCase();
  if (isOpenRoute(normalized)) return true;
  if (allowedKeys.has(normalized)) return true;
  for (const rule of ROUTE_PARENT_PREFIXES) {
    if (normalized === rule.prefix || normalized.startsWith(`${rule.prefix}/`)) {
      return allowedKeys.has(rule.parent);
    }
  }
  return false;
}

export interface FlattenedMenuNode {
  item: MenuDto;
  depth: number;
  hasChildren: boolean;
  ancestorIds: number[];
}

export function flattenMenuTree(items: MenuDto[], depth = 0, ancestorIds: number[] = []): FlattenedMenuNode[] {
  const result: FlattenedMenuNode[] = [];
  for (const item of sortMenuTree(items)) {
    const children = item.children ?? [];
    result.push({
      item,
      depth,
      hasChildren: children.length > 0,
      ancestorIds,
    });
    if (children.length > 0) {
      result.push(...flattenMenuTree(children, depth + 1, [...ancestorIds, item.id]));
    }
  }
  return result;
}

export function collectDescendantIds(item: MenuDto): Set<number> {
  const ids = new Set<number>();
  const walk = (nodes: MenuDto[]) => {
    for (const node of nodes) {
      ids.add(node.id);
      if (Array.isArray(node.children)) walk(node.children);
    }
  };
  if (Array.isArray(item.children)) walk(item.children);
  return ids;
}

export function matchesMenuQuery(item: MenuDto, query: string): boolean {
  const needle = normalizeVietnamese(query);
  if (!needle) return true;
  return (
    normalizeVietnamese(item.title).includes(needle) ||
    normalizeVietnamese(item.code).includes(needle) ||
    normalizeVietnamese(item.url).includes(needle)
  );
}

export function findMenuBreadcrumbTrail(items: MenuDto[], pathname: string): MenuDto[] {
  const target = (pathname.replace(/\/+$/, "") || "/").toLowerCase();
  const dfs = (nodes: MenuDto[], trail: MenuDto[]): MenuDto[] | null => {
    for (const node of nodes) {
      const nextTrail = [...trail, node];
      const key = normalizeRouteKey(node.url);
      if (key && (target === key || target.startsWith(`${key}/`))) {
        return nextTrail;
      }
      if (Array.isArray(node.children) && node.children.length > 0) {
        const found = dfs(node.children, nextTrail);
        if (found) return found;
      }
    }
    return null;
  };
  return dfs(items, []) ?? [];
}
