"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ExitIcon,
  HomeIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import type { MenuDto } from "@/features/menus/types";
import { useAuth } from "@/features/auth/AuthProvider";
import { menuApi, MENUS_CHANGED } from "@/features/menus/services/menuApi";
import {
  extractWorkspaces,
  filterMenusByWorkspace,
  readActiveWorkspaceId,
  readCachedMenus,
  sortMenus,
  writeActiveWorkspaceId,
  writeCachedMenus,
} from "@/features/workspace/workspaces";
import { notify } from "@/components/ui/Toaster";

// These backend URLs predate the Next.js routes.
const legacyRoutes: Record<string, string> = {
  "/user/infor": "/user-infor",
  "/my/evaluation": "/my-evaluation",
  "/permissions": "/admin/permission",
  "/menus": "/admin/menu",
};

const OPEN_ROUTES = new Set([
  "/dashboard",
  "/user-infor",
  "/my-evaluation",
  "/notifications",
]);

// Sub-routes not listed directly in the sidebar inherit access from their parent menu route.
const ROUTE_PARENT_PREFIXES: Array<readonly [prefix: string, parentMenuPath: string]> = [
  ["/summary/summary-list-detail/hrsummary", "/summary/summary-list/hrsummary"],
  ["/summary/summary-list-detail/summarydirector", "/summary/summary-list/summarydirector"],
];

export function menuHref(url?: string | null) {
  if (!url?.startsWith("/")) return "#";
  try {
    const target = new URL(url, "https://kpi.local");
    return target.origin === "https://kpi.local"
      ? (legacyRoutes[target.pathname] ?? target.pathname) + target.search + target.hash
      : "#";
  } catch {
    return "#";
  }
}

function normalizePath(path: string): string {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return (legacyRoutes[clean] ?? clean).toLowerCase();
}

function collectAllowedPaths(menus: MenuDto[], result = new Set<string>()): Set<string> {
  for (const menu of menus) {
    const href = menuHref(menu.url);
    if (href !== "#") {
      result.add(normalizePath(href));
    }
    if (menu.children?.length) {
      collectAllowedPaths(menu.children, result);
    }
  }
  return result;
}

function isOpenRoute(normalizedPath: string): boolean {
  for (const base of OPEN_ROUTES) {
    if (normalizedPath === base || normalizedPath.startsWith(base + "/")) return true;
  }
  return false;
}

function isPathAllowed(pathname: string, allowedPaths: Set<string>): boolean {
  const target = normalizePath(pathname);
  if (isOpenRoute(target) || allowedPaths.has(target)) return true;

  for (const [prefix, parentMenuPath] of ROUTE_PARENT_PREFIXES) {
    if (target === prefix || target.startsWith(prefix + "/")) {
      return allowedPaths.has(prefix) || allowedPaths.has(parentMenuPath);
    }
  }
  return false;
}

type MenuAccessContextValue = {
  navigation: MenuDto[];
  allMenus: MenuDto[];
  activeWorkspaceId: number | null;
  activeWorkspaceName: string;
  switchWorkspace: (workspaceId: number) => void;
  loading: boolean;
  error: string;
  reload: () => void;
};

const MenuAccessContext = createContext<MenuAccessContextValue | null>(null);

export function MenuProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [allMenus, setAllMenus] = useState<MenuDto[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const forceRefreshRef = useRef(false);

  const reload = useCallback(() => {
    forceRefreshRef.current = true;
    setRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    const userId = user?.id ?? "";
    const force = forceRefreshRef.current;

    if (!force && userId) {
      const cached = readCachedMenus(userId);
      if (cached) {
        setAllMenus(cached);
        setError("");
        setLoading(false);
        return;
      }
    }

    forceRefreshRef.current = false;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    menuApi
      .my(controller.signal)
      .then((menus) => {
        if (controller.signal.aborted) return;
        const sorted = sortMenus(menus);
        if (userId) writeCachedMenus(userId, sorted);
        setAllMenus(sorted);
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        const message =
          cause instanceof Error && cause.message === "UNAUTHORIZED"
            ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
            : "Chưa tải được menu. Vui lòng thử lại.";
        setAllMenus([]);
        setError(message);
        notify("error", message, "sidebar-menus");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [authLoading, user?.id, revision]);

  useEffect(() => {
    window.addEventListener(MENUS_CHANGED, reload);
    return () => window.removeEventListener(MENUS_CHANGED, reload);
  }, [reload]);

  const workspaces = useMemo(() => extractWorkspaces(allMenus), [allMenus]);

  useEffect(() => {
    if (!workspaces.length) return;
    const saved = readActiveWorkspaceId();
    const nextId = saved && workspaces.some((ws) => ws.id === saved) ? saved : workspaces[0].id;
    setActiveWorkspaceId(nextId);
    if (saved !== nextId) writeActiveWorkspaceId(nextId);
  }, [workspaces]);

  const resolvedWorkspaceId =
    activeWorkspaceId && workspaces.some((ws) => ws.id === activeWorkspaceId)
      ? activeWorkspaceId
      : (workspaces[0]?.id ?? null);

  const navigation = useMemo(
    () => filterMenusByWorkspace(allMenus, resolvedWorkspaceId),
    [allMenus, resolvedWorkspaceId],
  );
  const activeWorkspaceName = workspaces.find((ws) => ws.id === resolvedWorkspaceId)?.name ?? "";

  // Switch workspace in localStorage + sidebar state only, keeping the active page untouched.
  const switchWorkspace = useCallback((workspaceId: number) => {
    writeActiveWorkspaceId(workspaceId);
    setActiveWorkspaceId(workspaceId);
  }, []);

  const value = useMemo(
    () => ({
      navigation,
      allMenus,
      activeWorkspaceId: resolvedWorkspaceId,
      activeWorkspaceName,
      switchWorkspace,
      loading,
      error,
      reload,
    }),
    [
      navigation,
      allMenus,
      resolvedWorkspaceId,
      activeWorkspaceName,
      switchWorkspace,
      loading,
      error,
      reload,
    ],
  );

  return <MenuAccessContext.Provider value={value}>{children}</MenuAccessContext.Provider>;
}

export function useMyMenus() {
  const context = useContext(MenuAccessContext);
  if (!context) {
    throw new Error("useMyMenus must be used inside MenuProvider");
  }
  return context;
}

function UnpluggedCordSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 560"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="none"
      className={className}
    >
      {/* Top wire curving down into upper plug */}
      <path
        d="M36 0 C54 78, 128 84, 114 148 C100 205, 166 208, 150 236 C138 258, 118 252, 108 263"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Upper plug (tilted down-left) */}
      <g transform="translate(106 263) rotate(42)">
        <rect x="-10" y="-12" width="20" height="14" rx="4" fill="currentColor" />
        <rect x="-13" y="2" width="26" height="5" rx="2" fill="currentColor" />
        <line x1="-6" y1="7" x2="-6" y2="16" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <line x1="6" y1="7" x2="6" y2="16" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </g>

      {/* Disconnect spark rays in accent color */}
      <g stroke="rgb(var(--color-accent))" strokeWidth="2" strokeLinecap="round">
        <line x1="64" y1="258" x2="54" y2="246" />
        <line x1="56" y1="274" x2="43" y2="270" />
        <line x1="58" y1="291" x2="46" y2="298" />
        <line x1="115" y1="294" x2="127" y2="288" />
        <line x1="112" y1="311" x2="125" y2="316" />
        <line x1="99" y1="323" x2="108" y2="336" />
      </g>

      {/* Lower plug (tilted up-right) */}
      <g transform="translate(72 308) rotate(-138)">
        <rect x="-10" y="-12" width="20" height="14" rx="4" fill="currentColor" />
        <rect x="-13" y="2" width="26" height="5" rx="2" fill="currentColor" />
        <line x1="-6" y1="7" x2="-6" y2="15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity="0.65" />
        <line x1="6" y1="7" x2="6" y2="15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity="0.65" />
      </g>
      {/* Bottom wire sweeping down */}
      <path
        d="M66 314 C36 346, 52 384, 92 388 C134 392, 128 432, 92 454 C60 474, 148 510, 124 560"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DoodleMarks() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Scattered crosses */}
      <svg
        viewBox="0 0 24 24"
        className="absolute left-[31%] top-[24%] h-5 w-5 rotate-12 text-[rgb(var(--color-text)/0.85)]"
      >
        <path d="M5 5L19 19M19 5L5 19" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        className="hidden sm:block absolute left-[29%] top-[53%] h-3.5 w-3.5 -rotate-6 text-[rgb(var(--color-accent)/0.8)]"
      >
        <path d="M5 5L19 19M19 5L5 19" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        className="absolute bottom-[13%] right-[24%] h-7 w-7 rotate-12 text-[rgb(var(--color-text)/0.85)]"
      >
        <path d="M5 5L19 19M19 5L5 19" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" />
      </svg>

      {/* Scattered rings */}
      <span className="absolute right-[7%] top-[14%] h-14 w-14 rounded-full border-2 border-[rgb(var(--color-text)/0.7)]" />
      <span className="hidden sm:block absolute right-[23%] top-[30%] h-5 w-5 rounded-full border border-[rgb(var(--color-brand)/0.65)]" />
      <span className="hidden md:block absolute bottom-[14%] left-[21%] h-12 w-12 rounded-full border-2 border-[rgb(var(--color-text)/0.65)]" />
    </div>
  );
}

function GuardStatusCard({
  tone,
  badge,
  title,
  description,
  pathname,
  onRetry,
  onBack,
  onLogout,
  logoutBusy,
}: {
  tone: "denied" | "error";
  badge: string;
  title: string;
  description: string;
  pathname: string;
  onRetry?: () => void;
  onBack: () => void;
  onLogout: () => void;
  logoutBusy: boolean;
}) {
  const isDenied = tone === "denied";
  return (
    <div className="relative flex min-h-[calc(100vh-11rem)] w-full items-center justify-center overflow-hidden rounded-3xl border border-[rgb(var(--color-border)/0.55)] bg-[rgb(var(--color-surface)/0.7)] px-6 py-12 shadow-[var(--shadow-card)] sm:px-12">
      <UnpluggedCordSvg className="pointer-events-none absolute inset-y-0 left-2 hidden h-full w-40 text-[rgb(var(--color-text)/0.78)] md:block lg:left-8 lg:w-44" />
      <DoodleMarks />

      <section role="alert" className="relative z-10 w-full max-w-md md:ml-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--color-border)/0.8)] bg-[rgb(var(--color-page)/0.85)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[rgb(var(--color-muted))]">
          <span
            className={
              isDenied
                ? "h-2 w-2 rounded-full bg-[rgb(var(--color-accent))]"
                : "h-2 w-2 rounded-full bg-[rgb(var(--color-brand))]"
            }
          />
          {badge}
        </div>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-[rgb(var(--color-text))] sm:text-4xl">
          {title}
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-[rgb(var(--color-muted))] sm:text-[15px]">
          {description}
        </p>

        <p className="mt-2.5 flex items-center gap-2 text-xs text-[rgb(var(--color-muted))]">
          <span>Đường dẫn:</span>
          <code className="max-w-full truncate rounded-md border border-[rgb(var(--color-border)/0.65)] bg-[rgb(var(--color-page))] px-2 py-0.5 font-mono text-[rgb(var(--color-text))]">
            {pathname}
          </code>
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[rgb(var(--color-button-start))] to-[rgb(var(--color-button-end))] px-5 py-2.5 text-sm font-semibold text-[rgb(var(--color-on-brand))] shadow-md transition hover:opacity-95"
          >
            <HomeIcon className="h-4 w-4" aria-hidden="true" />
            Về Dashboard
          </Link>

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-3.5 py-2.5 text-sm font-medium text-[rgb(var(--color-text))] transition hover:bg-[rgb(var(--color-page))]"
            >
              <ReloadIcon className="h-4 w-4" aria-hidden="true" />
              Thử lại
            </button>
          )}

          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium text-[rgb(var(--color-text))] transition hover:bg-[rgb(var(--color-page))]"
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            Trở lại
          </button>

          <button
            type="button"
            disabled={logoutBusy}
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium text-[rgb(var(--color-muted))] transition hover:bg-[rgb(var(--color-page))] hover:text-[rgb(var(--color-text))] disabled:opacity-60"
          >
            <ExitIcon className="h-4 w-4" aria-hidden="true" />
            {logoutBusy ? "Đang đăng xuất…" : "Đăng xuất"}
          </button>
        </div>
      </section>
    </div>
  );
}

export function MenuRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { allMenus, loading, error, reload } = useMyMenus();
  const [logoutBusy, setLogoutBusy] = useState(false);
  const allowedPaths = useMemo(() => collectAllowedPaths(allMenus), [allMenus]);

  const handleLogout = useCallback(async () => {
    setLogoutBusy(true);
    try {
      await logout();
      router.replace("/login");
      router.refresh();
    } catch {
      notify("error", "Không thể đăng xuất. Vui lòng thử lại.");
      setLogoutBusy(false);
    }
  }, [logout, router]);

  if (isOpenRoute(normalizePath(pathname))) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-11rem)] items-center justify-center px-2 py-8">
        <div
          className="w-full max-w-lg rounded-2xl border border-[rgb(var(--color-border)/0.7)] bg-[rgb(var(--color-surface))] p-6 shadow-[var(--shadow-card)]"
          role="status"
          aria-busy="true"
        >
          <div className="flex items-center gap-3">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[rgb(var(--color-brand))] border-t-transparent" />
            <p className="text-sm text-[rgb(var(--color-muted))]">Đang kiểm tra quyền truy cập…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <GuardStatusCard
        tone="error"
        badge="Lỗi phân quyền"
        title="Không thể kiểm tra quyền"
        description={error}
        pathname={pathname}
        onRetry={reload}
        onBack={() => router.back()}
        onLogout={handleLogout}
        logoutBusy={logoutBusy}
      />
    );
  }

  if (!isPathAllowed(pathname, allowedPaths)) {
    return (
      <GuardStatusCard
        tone="denied"
        badge="403 · Không có quyền truy cập"
        title="Truy cập bị từ chối"
        description="Tài khoản của bạn chưa được cấp quyền xem màn hình này. Vui lòng quay về Dashboard hoặc đăng xuất để đổi tài khoản."
        pathname={pathname}
        onBack={() => router.back()}
        onLogout={handleLogout}
        logoutBusy={logoutBusy}
      />
    );
  }

  return <>{children}</>;
}
