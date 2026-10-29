"use client";

import {
  useEffect,
  useLayoutEffect,
  useOptimistic,
  startTransition,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
} from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { HamburgerMenuIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { usePathname, useRouter } from "next/navigation";
import type { MenuDto } from "@/types/menu";
import { menuApi, MENUS_CHANGED } from "@/features/menus/menuApi";
import { notify } from "@/components/ui/toast";
import styles from "./sidebar.module.css";

const NavigationIcon = dynamic(() => import("@/features/menus/MenuIcon").then(module => module.MenuIcon), {
  loading: () => <HamburgerMenuIcon className={styles.icon} aria-hidden="true" />,
});

// These backend URLs predate the Next.js routes.
const legacyRoutes: Record<string, string> = {
  "/user/infor": "/user-infor", "/my/evaluation": "/my-evaluation",
  "/permissions": "/admin/permission", "/menus": "/admin/menu",
};

function menuHref(url?: string | null) {
  if (!url?.startsWith("/")) return "#";
  try {
    const target = new URL(url, "https://kpi.local");
    return target.origin === "https://kpi.local"
      ? (legacyRoutes[target.pathname] ?? target.pathname) + target.search + target.hash : "#";
  } catch { return "#"; }
}

function containsPath(menu: MenuDto, pathname: string): boolean {
  return menuHref(menu.url).split(/[?#]/)[0] === pathname || menu.children?.some(child => containsPath(child, pathname));
}

function sortMenus(menus: MenuDto[]): MenuDto[] {
  return [...menus].sort((a, b) => a.orderNo - b.orderNo)
    .map(menu => ({ ...menu, children: sortMenus(menu.children ?? []) }));
}

export function Sidebar() {
  const [navigation, setNavigation] = useState<MenuDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuRevision, setMenuRevision] = useState(0);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [selectedPathname, setSelectedPathname] = useOptimistic(pathname);
  const selectedGroupIndex = navigation.findIndex(item => item.id === selectedGroupId && containsPath(item, selectedPathname));
  const activeIndex = selectedGroupIndex >= 0 ? selectedGroupIndex : navigation.findIndex(item => containsPath(item, selectedPathname));
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [highlightOffset, setHighlightOffset] = useState(0);
  const [flyoutTop, setFlyoutTop] = useState(0);
  const [lastFlyoutIndex, setLastFlyoutIndex] = useState(Math.max(activeIndex, 0));
  const sidebarRef = useRef<HTMLElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const mobileDialogRef = useRef<HTMLDialogElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightedIndex = hoveredIndex ?? focusedIndex ?? Math.max(activeIndex, 0);
  const visiblyCollapsed = collapsed && !mobileOpen;
  const flyoutIndex = visiblyCollapsed ? (hoveredIndex ?? focusedIndex) : null;
  const flyoutItem = visiblyCollapsed ? navigation[flyoutIndex ?? lastFlyoutIndex] : null;

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => setMenuRevision(value => value + 1);
    setLoading(true); setError("");
    menuApi.my(controller.signal).then(menus => {
      if (controller.signal.aborted) return;
      setNavigation(sortMenus(menus));
      setHoveredIndex(null); setFocusedIndex(null); setLastFlyoutIndex(0);
    }).catch(cause => {
      if (controller.signal.aborted) return;
      const message = cause instanceof Error && cause.message === "UNAUTHORIZED"
        ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." : "Chưa tải được menu. Vui lòng thử lại.";
      setNavigation([]); setError(message); notify("error", message, "sidebar-menus");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    window.addEventListener(MENUS_CHANGED, refresh);
    return () => { controller.abort(); window.removeEventListener(MENUS_CHANGED, refresh); };
  }, [menuRevision]);

  useEffect(() => {
    if (!mobileOpen) return;
    const dialog = mobileDialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const viewport = window.matchMedia("(max-width: 1023px)");
    const closeOnDesktop = () => {
      if (!viewport.matches) setMobileOpen(false);
    };
    viewport.addEventListener("change", closeOnDesktop);
    return () => {
      viewport.removeEventListener("change", closeOnDesktop);
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  useLayoutEffect(() => {
    if (flyoutIndex !== null) setLastFlyoutIndex(flyoutIndex);
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => {
      const item = itemRefs.current[highlightedIndex];
      if (!item) return;
      const bounds = item.getBoundingClientRect();
      setHighlightOffset(bounds.top - nav.getBoundingClientRect().top);
      const sidebar = sidebarRef.current;
      const flyout = flyoutRef.current;
      if (!sidebar || !flyout) return;
      const sidebarTop = sidebar.getBoundingClientRect().top;
      // Center the menu on its icon and keep it inside short viewports.
      const centeredTop = bounds.top + bounds.height / 2 - flyout.offsetHeight / 2;
      const top = Math.max(
        12,
        Math.min(centeredTop, window.innerHeight - flyout.offsetHeight - 12),
      );
      setFlyoutTop(top - sidebarTop);
    };
    measure();
    // Accordion height changes must move the notch with the actual menu row.
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    if (flyoutRef.current) observer.observe(flyoutRef.current);
    const surface = nav.parentElement;
    surface?.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      surface?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [highlightedIndex, mobileOpen, visiblyCollapsed, flyoutIndex, navigation]);

  useEffect(() => {
    if (flyoutIndex === null) return;
    const dismiss = (event: PointerEvent) => {
      if (!sidebarRef.current?.contains(event.target as Node)) {
        setHoveredIndex(null);
        setFocusedIndex(null);
      }
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [flyoutIndex]);

  useEffect(
    () => () => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    },
    [],
  );

  function cancelReturn() {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  }

  function scheduleReturn() {
    cancelReturn();
    // A short exit grace period prevents flicker when the pointer crosses an edge quickly.
    leaveTimer.current = setTimeout(() => {
      setHoveredIndex(null);
      if (!document.activeElement?.matches(":focus-visible")) setFocusedIndex(null);
    }, 180);
  }

  function navigate(event: { preventDefault: () => void }, href: string, index: number) {
    if (href === "#") return;
    event.preventDefault();
    cancelReturn();
    setMobileOpen(false);
    setHoveredIndex(null);
    setFocusedIndex(null);
    setSelectedGroupId(navigation[index].id);
    startTransition(() => {
      setSelectedPathname(new URL(href, window.location.origin).pathname);
      router.push(href);
    });
  }

  function renderSubitems(item: MenuDto, index: number) {
    return item.children.map(child => {
      const href = menuHref(child.url);
      const hasChildren = child.children.length > 0;
      const open = openGroups[child.id] ?? containsPath(child, selectedPathname);
      const submenuId = `sidebar-child-${child.id}`;
      const interaction = {
        className: styles.subitem,
        onPointerEnter: () => { cancelReturn(); setHoveredIndex(index); },
        onFocus: (event: FocusEvent<HTMLElement>) => {
          if (event.currentTarget.matches(":focus-visible")) setFocusedIndex(index);
        },
      };
      const content = <><NavigationIcon name={child.icon} fallback /><span>{child.title}</span>{hasChildren && <ChevronDownIcon className={styles.nestedChevron} data-open={open} aria-hidden="true" />}</>;
      return <div key={child.id}>
        {hasChildren ? <button {...interaction} type="button" aria-expanded={open} aria-controls={submenuId} onClick={() => setOpenGroups(value => ({ ...value, [child.id]: !open }))}>{content}</button>
          : href === "#" ? <button {...interaction} type="button" disabled title="Menu chưa có đường dẫn">{content}</button>
          : <Link {...interaction} href={href} aria-current={containsPath(child, selectedPathname) ? "page" : undefined} onNavigate={event => navigate(event, href, index)}>{content}</Link>}
        {hasChildren && <div id={submenuId} className={styles.nestedMenu} hidden={!open}>{renderSubitems(child, index)}</div>}
      </div>;
    });
  }

  const sidebar = (
    <aside
      ref={sidebarRef}
      className={styles.sidebar}
      data-collapsed={visiblyCollapsed}
      aria-label="Thanh điều hướng"
      onPointerEnter={cancelReturn}
      onPointerLeave={scheduleReturn}
      onFocusCapture={cancelReturn}
      onKeyDown={(event) => {
        if (flyoutIndex === null) return;
        if (event.key === "ArrowRight" && event.target === itemRefs.current[flyoutIndex]) {
          const firstLink = flyoutRef.current?.querySelector<HTMLElement>("a, button:not(:disabled)");
          if (firstLink) {
            event.preventDefault();
            firstLink.focus();
          }
        }
        if (event.key === "Escape" || event.key === "ArrowLeft") {
          event.preventDefault();
          itemRefs.current[flyoutIndex]?.focus();
          cancelReturn();
          setHoveredIndex(null);
          setFocusedIndex(null);
        }
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocusedIndex(null);
          scheduleReturn();
        }
      }}
    >
      <div className={styles.frame}>
        <div className={styles.surface}>
          <div className={styles.header}>
            <div className={styles.identity}>
              <span className={styles.mark} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <div>
                <strong>Hệ thống KPI</strong>
                <span>ĐÈO CẢ GROUP</span>
              </div>
            </div>
            <button
              type="button"
              className={styles.collapse}
              onClick={() => {
                if (mobileOpen) {
                  setMobileOpen(false);
                  return;
                }
                cancelReturn();
                setCollapsed((value) => !value);
                setHoveredIndex(null);
                setFocusedIndex(null);
              }}
              aria-label={
                mobileOpen
                  ? "Đóng menu điều hướng"
                  : collapsed
                    ? "Mở rộng thanh điều hướng"
                    : "Thu gọn thanh điều hướng"
              }
              aria-expanded={!visiblyCollapsed}
              aria-controls="workspace-navigation"
              title={mobileOpen ? "Đóng menu" : collapsed ? "Mở rộng" : "Thu gọn"}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {mobileOpen ? (
                  <path d="m6 6 12 12M6 18 18 6" />
                ) : (
                  <>
                    <rect x="3" y="4" width="18" height="16" rx="4" />
                    <path d="M9 4v16" />
                    <path className={styles.collapseArrow} d="m16 9-3 3 3 3" />
                  </>
                )}
              </svg>
            </button>
          </div>

          <p className={styles.sectionLabel}>
            <span>Công việc</span>
            <i aria-hidden="true" />
          </p>
          <nav
            ref={navRef}
            id="workspace-navigation"
            className={styles.navigation}
            aria-label="Điều hướng chính"
            style={{ "--highlight-offset": `${highlightOffset}px` } as CSSProperties}
          >
            {!navigation.length && <div className={styles.menuStatus} role={error ? "alert" : "status"}>
              <p>{error || (loading ? "Đang tải menu…" : "Tài khoản chưa có menu được cấp.")}</p>
              {error && <button type="button" onClick={() => setMenuRevision(value => value + 1)}>Thử lại</button>}
            </div>}
            {!!navigation.length && <div className={styles.indicator} aria-hidden="true">
              <span className={styles.cutout}>
                <span className={styles.recessShadow} />
              </span>
            </div>}
            {navigation.map((item, index) => {
              const hasChildren = item.children.length > 0;
              const href = menuHref(item.url);
              const groupOpen = openGroups[item.id] ?? containsPath(item, selectedPathname);
              const submenuId = `sidebar-submenu-${item.id}`;
              const interaction = {
                className: styles.item,
                "data-highlighted": highlightedIndex === index,
                "aria-label": item.title,
                ref: (element: HTMLElement | null) => {
                  itemRefs.current[index] = element;
                },
                onPointerEnter: (event: React.PointerEvent<HTMLElement>) => {
                  if (event.pointerType === "touch") return;
                  cancelReturn();
                  setHoveredIndex(index);
                },
                onFocus: (event: FocusEvent<HTMLElement>) =>
                  setFocusedIndex(event.currentTarget.matches(":focus-visible") ? index : null),
              };
              const content = (
                <>
                  <NavigationIcon name={item.icon} className={styles.icon} fallback />
                  <span className={styles.label}>{item.title}</span>
                  {hasChildren ? (
                    <svg
                      className={styles.groupChevron}
                      data-open={groupOpen}
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m6 8 4 4 4-4" />
                    </svg>
                  ) : (
                    <svg
                      className={styles.itemArrow}
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 10h10m-4-4 4 4-4 4" />
                    </svg>
                  )}
                </>
              );

              return (
                <div key={item.id} className={styles.group}>
                  {hasChildren ? (
                    <button
                      {...interaction}
                      type="button"
                      aria-expanded={visiblyCollapsed ? flyoutIndex === index : groupOpen}
                      aria-controls={visiblyCollapsed ? "sidebar-flyout" : submenuId}
                      onClick={() => {
                        if (visiblyCollapsed) setFocusedIndex(index);
                        else setOpenGroups((value) => ({ ...value, [item.id]: !groupOpen }));
                      }}
                    >
                      {content}
                    </button>
                  ) : href === "#" ? (
                    <button {...interaction} type="button" disabled title="Menu chưa có đường dẫn">{content}</button>
                  ) : (
                    <Link
                      {...interaction}
                      href={href}
                      onNavigate={(event) => navigate(event, href, index)}
                      aria-current={activeIndex === index ? "page" : undefined}
                    >
                      {content}
                    </Link>
                  )}
                  {hasChildren && (
                    <div
                      id={submenuId}
                      className={styles.submenu}
                      data-open={groupOpen}
                      inert={!groupOpen || visiblyCollapsed}
                    >
                      <div className={styles.submenuInner}>
                        <div className={styles.submenuContent}>{renderSubitems(item, index)}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className={styles.footer}>
            <div className={styles.footerArt} aria-hidden="true" />
            <span className={styles.footerRule} aria-hidden="true" />
            <p>
              Nghĩ khác biệt.
              <br />
              <strong>Tạo cách biệt.</strong>
            </p>
            <span className={styles.footerMonogram} aria-hidden="true">
              DCG
            </span>
          </div>
        </div>
      </div>
      {flyoutItem && (
        <div
          ref={flyoutRef}
          id="sidebar-flyout"
          className={styles.flyout}
          data-open={flyoutIndex !== null}
          inert={flyoutIndex === null}
          style={{ "--flyout-top": `${flyoutTop}px` } as CSSProperties}
        >
          <span className={styles.flyoutArrow} aria-hidden="true">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m12 6-4 4 4 4" />
            </svg>
          </span>
          <div className={styles.flyoutBody}>
            {flyoutItem.children.length > 0 ? (
              <nav className={styles.flyoutLinks} aria-label={flyoutItem.title}>
                {renderSubitems(flyoutItem, flyoutIndex ?? lastFlyoutIndex)}
              </nav>
            ) : (
              <span className={styles.flyoutHint}>{flyoutItem.title}</span>
            )}
          </div>
        </div>
      )}
    </aside>
  );

  return (
    <>
      <button
        type="button"
        className={styles.mobileToggle}
        onClick={() => setMobileOpen(true)}
        aria-label="Mở menu điều hướng"
        aria-haspopup="dialog"
        aria-expanded={mobileOpen}
        aria-controls="mobile-navigation-dialog"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M5 6h14M5 12h14M5 18h14" />
        </svg>
      </button>
      {!mobileOpen && sidebar}
      <dialog
        ref={mobileDialogRef}
        id="mobile-navigation-dialog"
        className={styles.mobileDialog}
        aria-label="Menu điều hướng"
        onCancel={() => setMobileOpen(false)}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            setMobileOpen(false);
        }}
      >
        {mobileOpen && sidebar}
      </dialog>
    </>
  );
}
