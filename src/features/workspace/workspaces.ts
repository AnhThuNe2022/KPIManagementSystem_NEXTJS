import type { MenuDto } from "@/features/menus/types";

const MENUS_CACHE_KEY = "dcg-my-menus-cache";
const ACTIVE_WORKSPACE_KEY = "dcg-active-workspace-id";

export type WorkspaceIconKey = "kpi" | "p2" | "upcoming" | "upcoming-2" | "upcoming-3";

export interface WorkspaceSummary {
  id: number;
  name: string;
}

export interface WorkspaceOption {
  id: string;
  workspaceId: number | null;
  name: string;
  description: string;
  statusLabel: string;
  icon: WorkspaceIconKey;
  available: boolean;
}

export const WORKSPACES: readonly WorkspaceOption[] = [
  {
    id: "kpi",
    workspaceId: 1,
    name: "Đánh giá KPI",
    description: "Quản trị mục tiêu, quy trình đánh giá định kỳ và tổng hợp kết quả toàn tập đoàn.",
    statusLabel: "Workspace gốc",
    icon: "kpi",
    available: true,
  },
  {
    id: "p2",
    workspaceId: 2,
    name: "Đánh giá P2",
    description: "Không gian đánh giá năng lực vị trí, khung chức danh và hiệu suất theo chuẩn P2.",
    statusLabel: "Workspace 2",
    icon: "p2",
    available: true,
  },
  {
    id: "upcoming",
    workspaceId: null,
    name: "Không gian mới 1",
    description: "Sẵn sàng mở rộng thêm các phân hệ quản trị tiếp theo của Đèo Cả Group.",
    statusLabel: "Sắp ra mắt",
    icon: "upcoming",
    available: false,
  },
  {
    id: "upcoming-2",
    workspaceId: null,
    name: "Không gian mới 2",
    description: "Đang trong lộ trình phát triển và tích hợp đồng bộ vào hệ sinh thái nội bộ.",
    statusLabel: "Sắp ra mắt",
    icon: "upcoming-2",
    available: false,
  },
  {
    id: "upcoming-3",
    workspaceId: null,
    name: "Không gian mới 3",
    description: "Dự phòng cho các công cụ vận hành, theo dõi và báo cáo chuyên sâu sắp tới.",
    statusLabel: "Sắp ra mắt",
    icon: "upcoming-3",
    available: false,
  },
];

export function sortMenus(menus: MenuDto[]): MenuDto[] {
  return [...menus]
    .sort((a, b) => a.orderNo - b.orderNo)
    .map((menu) => ({ ...menu, children: sortMenus(menu.children ?? []) }));
}

export function readCachedMenus(userId: string): MenuDto[] | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(MENUS_CACHE_KEY) || "") as {
      userId?: string;
      menus?: MenuDto[];
    };
    if (!Array.isArray(parsed.menus) || (parsed.userId && parsed.userId !== userId)) return null;
    return sortMenus(parsed.menus);
  } catch {
    return null;
  }
}

export function writeCachedMenus(userId: string, menus: MenuDto[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MENUS_CACHE_KEY, JSON.stringify({ userId, menus: sortMenus(menus) }));
  } catch {
    // ignore storage errors
  }
}

export function readActiveWorkspaceId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const value = Number(localStorage.getItem(ACTIVE_WORKSPACE_KEY));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function writeActiveWorkspaceId(workspaceId: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, String(workspaceId));
  } catch {
    // ignore storage errors
  }
}

export function clearWorkspaceCache() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(MENUS_CACHE_KEY);
    localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
  } catch {
    // ignore storage errors
  }
}

export function extractWorkspaces(menus: MenuDto[]): WorkspaceSummary[] {
  const map = new Map<number, string>();
  const walk = (items: MenuDto[]) => {
    for (const item of items) {
      if (typeof item.workspaceId === "number" && item.workspaceId > 0 && !map.has(item.workspaceId)) {
        map.set(item.workspaceId, item.workspaceName?.trim() || `Workspace ${item.workspaceId}`);
      }
      if (item.children?.length) walk(item.children);
    }
  };
  walk(menus);
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([id, name]) => ({ id, name }));
}

export function filterMenusByWorkspace(menus: MenuDto[], workspaceId: number | null): MenuDto[] {
  if (!workspaceId || extractWorkspaces(menus).length === 0) return menus;
  const walk = (items: MenuDto[]): MenuDto[] =>
    items.reduce<MenuDto[]>((acc, item) => {
      const children = walk(item.children ?? []);
      if (item.workspaceId === workspaceId || children.length > 0) {
        acc.push({ ...item, children });
      }
      return acc;
    }, []);
  return walk(menus);
}

export function resolveWorkspaceCards(menus: MenuDto[], activeWorkspaceId: number | null): WorkspaceOption[] {
  const liveList = extractWorkspaces(menus);
  if (liveList.length === 0) return [...WORKSPACES];

  const liveById = new Map(liveList.map((ws) => [ws.id, ws]));
  const presetIds = new Set<number>();

  const cards = WORKSPACES.map((preset) => {
    if (preset.workspaceId === null) return preset;
    presetIds.add(preset.workspaceId);
    const live = liveById.get(preset.workspaceId);
    if (!live) return { ...preset, available: false, statusLabel: "Chưa cấp quyền" };
    return {
      ...preset,
      name: live.name,
      available: true,
      statusLabel: activeWorkspaceId === live.id ? "Đang hoạt động" : preset.statusLabel,
    };
  });

  const extras: WorkspaceOption[] = liveList
    .filter((ws) => !presetIds.has(ws.id))
    .map((ws) => ({
      id: `ws-${ws.id}`,
      workspaceId: ws.id,
      name: ws.name,
      description: `Không gian làm việc ${ws.name} thuộc hệ sinh thái Đèo Cả Group.`,
      statusLabel: activeWorkspaceId === ws.id ? "Đang hoạt động" : `Workspace ${ws.id}`,
      icon: "p2",
      available: true,
    }));

  if (!extras.length) return cards;
  const upcomingIdx = cards.findIndex((card) => card.workspaceId === null);
  return upcomingIdx < 0
    ? [...cards, ...extras]
    : [...cards.slice(0, upcomingIdx), ...extras, ...cards.slice(upcomingIdx)];
}
