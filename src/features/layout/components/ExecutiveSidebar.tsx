"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, RefreshCw, Search, X } from "lucide-react";
import { resolveMenuIcon } from "@/design-system/registries";
import { matchesMenuQuery, normalizeMenuHref } from "@/features/menus/menuTree";
import type { MenuDto } from "@/features/menus/types";
import { CollapseRailIcon, DcgSparkIcon } from "./BrandGlyphs";
import { SidebarSubtree, menuContainsPath } from "./SidebarSubtree";

function filterSidebarTree(nodes: MenuDto[], query: string): MenuDto[] {
  const trimmed = query.trim();
  if (!trimmed) return nodes;
  const result: MenuDto[] = [];
  for (const node of nodes) {
    const matchingChildren = filterSidebarTree(node.children ?? [], trimmed);
    if (matchesMenuQuery(node, trimmed) || matchingChildren.length > 0) {
      result.push({
        ...node,
        children: matchingChildren.length > 0 ? matchingChildren : node.children ?? [],
      });
    }
  }
  return result;
}

export function ExecutiveSidebar({
  navigation,
  loading,
  error,
  onReload,
  normalizedPathname,
  collapsed,
  fullscreen,
  onToggleCollapse,
  onEnterFullscreen,
  onExitFullscreen,
  isMobileVariant = false,
  onMobileClose,
}: {
  navigation: MenuDto[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
  normalizedPathname: string;
  collapsed: boolean;
  fullscreen: boolean;
  onToggleCollapse: () => void;
  onEnterFullscreen: () => void;
  onExitFullscreen: () => void;
  isMobileVariant?: boolean;
  onMobileClose?: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [highlightOffset, setHighlightOffset] = useState(0);
  const [flyoutTop, setFlyoutTop] = useState(0);
  const [lastFlyoutIndex, setLastFlyoutIndex] = useState(0);
  const [dockOpenIndex, setDockOpenIndex] = useState<number | null>(null);

  const sidebarRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visiblyCollapsed = !isMobileVariant && collapsed;
  const visiblyFullscreen = !isMobileVariant && fullscreen;

  const filteredNav = useMemo(
    () => (visiblyCollapsed ? navigation : filterSidebarTree(navigation, searchQuery)),
    [navigation, searchQuery, visiblyCollapsed],
  );

  const activeIndex = useMemo(
    () => filteredNav.findIndex((item) => menuContainsPath(item, normalizedPathname)),
    [filteredNav, normalizedPathname],
  );

  const highlightedIndex =
    hoveredIndex ?? focusedIndex ?? (activeIndex >= 0 ? activeIndex : 0);

  const flyoutIndex =
    visiblyCollapsed && !visiblyFullscreen ? (hoveredIndex ?? focusedIndex) : null;
  const flyoutItem =
    visiblyCollapsed && !visiblyFullscreen
      ? filteredNav[flyoutIndex ?? lastFlyoutIndex] ?? null
      : null;

  const cancelLeave = () => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  };

  const scheduleLeave = () => {
    cancelLeave();
    leaveTimer.current = setTimeout(() => {
      setHoveredIndex(null);
      setFocusedIndex(null);
      setDockOpenIndex(null);
    }, 170);
  };

  useEffect(() => () => cancelLeave(), []);

  // Measure sliding concave cutout notch & collapsed flyout position
  useLayoutEffect(() => {
    if (flyoutIndex !== null) setLastFlyoutIndex(flyoutIndex);
    const nav = navRef.current;
    if (!nav || filteredNav.length === 0) return;

    const measure = () => {
      const targetEl = itemRefs.current[highlightedIndex];
      if (!targetEl) return;
      const bounds = targetEl.getBoundingClientRect();
      setHighlightOffset(bounds.top - nav.getBoundingClientRect().top);

      const sidebar = sidebarRef.current;
      const flyout = flyoutRef.current;
      if (!sidebar || !flyout) return;
      const sidebarTop = sidebar.getBoundingClientRect().top;
      const centeredTop = bounds.top + bounds.height / 2 - flyout.offsetHeight / 2;
      const clampedTop = Math.max(
        12,
        Math.min(centeredTop, window.innerHeight - flyout.offsetHeight - 12),
      );
      setFlyoutTop(clampedTop - sidebarTop);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    if (flyoutRef.current) observer.observe(flyoutRef.current);
    const scrollParent = nav.parentElement;
    scrollParent?.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      scrollParent?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [filteredNav.length, flyoutIndex, highlightedIndex, openGroups, visiblyCollapsed]);

  // Escape key closes fullscreen dock or flyout
  useEffect(() => {
    if (!visiblyFullscreen && flyoutIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (dockOpenIndex !== null) {
        setDockOpenIndex(null);
      } else if (visiblyFullscreen) {
        onExitFullscreen();
      } else {
        setHoveredIndex(null);
        setFocusedIndex(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dockOpenIndex, flyoutIndex, onExitFullscreen, visiblyFullscreen]);

  // Outside click dismisses dock popup or flyout
  useEffect(() => {
    if (dockOpenIndex === null && flyoutIndex === null) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (flyoutIndex !== null && !sidebarRef.current?.contains(target)) {
        setHoveredIndex(null);
        setFocusedIndex(null);
      }
      if (dockOpenIndex !== null && !dockRef.current?.contains(target)) {
        setDockOpenIndex(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [dockOpenIndex, flyoutIndex]);

  const handleToggleGroup = (id: number, currentOpen: boolean) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !currentOpen }));
  };

  const handleNavigate = () => {
    cancelLeave();
    setHoveredIndex(null);
    setFocusedIndex(null);
    setDockOpenIndex(null);
    onMobileClose?.();
  };

  const sidebarBody = (
    <div className="dcg-sidebar-surface">
      {/* Header row: CÔNG VIỆC + Focus Dock + Collapse */}
      <div className="dcg-sidebar-head">
        <p className="dcg-sidebar-sectionLabel">
          <span>Công việc</span>
          <i aria-hidden="true" />
        </p>
        {!isMobileVariant ? (
          <div className="dcg-sidebar-headActions">
            <button
              type="button"
              className="dcg-sidebar-dockBtn"
              onClick={() => {
                cancelLeave();
                setHoveredIndex(null);
                setFocusedIndex(null);
                onEnterFullscreen();
              }}
              aria-label="Chế độ tập trung (Dock nổi)"
              title="Chế độ tập trung (Dock nổi)"
              tabIndex={visiblyCollapsed ? -1 : 0}
            >
              <DcgSparkIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="dcg-sidebar-collapseBtn"
              onClick={() => {
                cancelLeave();
                setHoveredIndex(null);
                setFocusedIndex(null);
                onToggleCollapse();
              }}
              aria-label={visiblyCollapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
              aria-expanded={!visiblyCollapsed}
              title={visiblyCollapsed ? "Mở rộng" : "Thu gọn"}
            >
              <CollapseRailIcon />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="dcg-sidebar-collapseBtn"
            onClick={onMobileClose}
            aria-label="Đóng menu điều hướng"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Quick sidebar search */}
      <div className="dcg-sidebar-searchWrap">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm nhanh menu..."
            aria-label="Tìm nhanh menu"
            className="dcg-sidebar-searchInput"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Xóa từ khóa tìm menu"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-secondary hover:text-primary"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Navigation items + liquid concave cutout indicator */}
      <nav
        ref={navRef}
        id={isMobileVariant ? "mobile-workspace-navigation" : "workspace-navigation"}
        className="dcg-sidebar-nav"
        aria-label="Điều hướng chính"
        style={{ "--highlight-offset": `${highlightOffset}px` } as CSSProperties}
      >
        {filteredNav.length === 0 ? (
          <div className="px-5 py-4 text-xs text-secondary" role={error ? "alert" : "status"}>
            <p>
              {error ||
                (loading
                  ? "Đang tải menu..."
                  : searchQuery.trim()
                    ? "Không tìm thấy mục menu phù hợp."
                    : "Tài khoản chưa có menu được cấp.")}
            </p>
            {error ? (
              <button
                type="button"
                onClick={onReload}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-overlay-hover"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Thử lại
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div
              className="dcg-sidebar-indicator"
              data-on-active={highlightedIndex === activeIndex}
              aria-hidden="true"
            >
              <span className="dcg-sidebar-cutout">
                <span className="dcg-sidebar-cutoutAccent" />
                <span className="dcg-sidebar-recess" />
              </span>
            </div>

            {filteredNav.map((item, index) => {
              const IconComp = resolveMenuIcon(item.icon);
              const children = Array.isArray(item.children) ? item.children : [];
              const hasChildren = children.length > 0;
              const href = normalizeMenuHref(item.url);
              const isCurrent = activeIndex === index;
              const isGroupOpen =
                Boolean(searchQuery.trim()) || (openGroups[item.id] ?? isCurrent);

              const sharedInteraction = {
                className: "dcg-sidebar-item",
                "data-highlighted": highlightedIndex === index,
                "aria-label": item.title,
                ref: (el: HTMLElement | null) => {
                  itemRefs.current[index] = el;
                },
                onPointerEnter: (e: React.PointerEvent<HTMLElement>) => {
                  if (e.pointerType === "touch") return;
                  cancelLeave();
                  setHoveredIndex(index);
                },
                onFocus: () => setFocusedIndex(index),
              };

              const itemInner = (
                <>
                  <span className="dcg-sidebar-itemIcon">
                    <IconComp width={18} height={18} />
                  </span>
                  <span className="dcg-sidebar-label">{item.title}</span>
                  {hasChildren ? (
                    <ChevronDown
                      className="dcg-sidebar-chevron"
                      data-open={isGroupOpen}
                      aria-hidden="true"
                    />
                  ) : (
                    <ArrowRight className="dcg-sidebar-arrow" aria-hidden="true" />
                  )}
                </>
              );

              return (
                <div key={item.id} className="min-w-0">
                  {hasChildren ? (
                    <button
                      {...sharedInteraction}
                      type="button"
                      aria-expanded={visiblyCollapsed ? flyoutIndex === index : isGroupOpen}
                      onClick={() => {
                        if (visiblyCollapsed) {
                          setFocusedIndex(index);
                        } else {
                          handleToggleGroup(item.id, isGroupOpen);
                        }
                      }}
                    >
                      {itemInner}
                    </button>
                  ) : href === "#" ? (
                    <button
                      {...sharedInteraction}
                      type="button"
                      disabled
                      title="Menu chưa có đường dẫn"
                    >
                      {itemInner}
                    </button>
                  ) : (
                    <Link
                      {...sharedInteraction}
                      href={href}
                      aria-current={isCurrent ? "page" : undefined}
                      onClick={handleNavigate}
                    >
                      {itemInner}
                    </Link>
                  )}

                  {hasChildren ? (
                    <div
                      className="dcg-sidebar-submenu"
                      data-open={isGroupOpen && !visiblyCollapsed}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div className="dcg-sidebar-submenuContent">
                          <SidebarSubtree
                            items={children}
                            normalizedPathname={normalizedPathname}
                            openGroups={openGroups}
                            onToggleGroup={handleToggleGroup}
                            onNavigate={handleNavigate}
                            onInteract={() => {
                              cancelLeave();
                              setHoveredIndex(index);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </>
        )}
      </nav>

      {/* Deoca Bridge Brand Footer */}
      <div className="dcg-sidebar-footer">
        <div className="dcg-sidebar-bridgeArt" aria-hidden="true" />
        {!isMobileVariant ? (
          <button
            type="button"
            className="dcg-spark-trigger"
            onClick={() => {
              cancelLeave();
              setHoveredIndex(null);
              setFocusedIndex(null);
              onEnterFullscreen();
            }}
            aria-label="Chế độ toàn màn hình (Dock nổi)"
            title="Chế độ toàn màn hình (Dock nổi)"
            tabIndex={visiblyCollapsed && !visiblyFullscreen ? 0 : -1}
          >
            <DcgSparkIcon />
          </button>
        ) : null}
        <span className="dcg-sidebar-footerRule" aria-hidden="true" />
        <p className="dcg-sidebar-slogan">
          Nghĩ khác biệt.
          <br />
          <strong>Tạo cách biệt.</strong>
        </p>
        <span className="dcg-sidebar-monogram" aria-hidden="true">
          DCG
        </span>
      </div>
    </div>
  );

  if (isMobileVariant) {
    return <div className="flex h-full flex-col bg-surface">{sidebarBody}</div>;
  }

  return (
    <aside
      ref={sidebarRef}
      className="dcg-sidebar"
      data-collapsed={visiblyCollapsed}
      data-fullscreen={visiblyFullscreen}
      aria-label="Thanh điều hướng"
      onPointerEnter={cancelLeave}
      onPointerLeave={scheduleLeave}
    >
      <div className="dcg-sidebar-frame">{sidebarBody}</div>

      {/* Collapsed Rail Floating Flyout */}
      {flyoutItem ? (
        <div
          ref={flyoutRef}
          className="dcg-sidebar-flyout"
          data-open={flyoutIndex !== null}
          style={{ "--flyout-top": `${flyoutTop}px` } as CSSProperties}
          onPointerEnter={cancelLeave}
          onPointerLeave={scheduleLeave}
        >
          <div className="dcg-sidebar-flyoutBody">
            <div className="mb-1.5 border-b border-border px-2.5 pb-1.5 text-xs font-bold text-primary">
              {flyoutItem.title}
            </div>
            {Array.isArray(flyoutItem.children) && flyoutItem.children.length > 0 ? (
              <nav className="flex flex-col gap-0.5" aria-label={flyoutItem.title}>
                <SidebarSubtree
                  items={flyoutItem.children}
                  normalizedPathname={normalizedPathname}
                  openGroups={openGroups}
                  onToggleGroup={handleToggleGroup}
                  onNavigate={handleNavigate}
                  onInteract={cancelLeave}
                />
              </nav>
            ) : (
              <Link
                href={normalizeMenuHref(flyoutItem.url)}
                className="dcg-sidebar-subitem"
                onClick={handleNavigate}
              >
                <span>Mở {flyoutItem.title}</span>
              </Link>
            )}
          </div>
        </div>
      ) : null}

      {/* Fullscreen Glassmorphic Floating Bottom Dock */}
      {visiblyFullscreen ? (
        <div
          ref={dockRef}
          className="dcg-dock"
          role="toolbar"
          aria-label="Thanh điều hướng nhanh toàn màn hình"
        >
          {navigation.map((item, index) => {
            const IconComp = resolveMenuIcon(item.icon);
            const children = Array.isArray(item.children) ? item.children : [];
            const hasChildren = children.length > 0;
            const href = normalizeMenuHref(item.url);
            const isActive = menuContainsPath(item, normalizedPathname);
            const isOpen = dockOpenIndex === index;

            return (
              <div
                key={item.id}
                className="relative"
                onPointerEnter={(e) => {
                  if (e.pointerType === "touch") return;
                  cancelLeave();
                  setDockOpenIndex(index);
                }}
                onPointerLeave={scheduleLeave}
              >
                {hasChildren ? (
                  <button
                    type="button"
                    className="dcg-dock-item"
                    data-active={isActive}
                    data-open={isOpen}
                    aria-label={item.title}
                    aria-expanded={isOpen}
                    onClick={() => setDockOpenIndex((cur) => (cur === index ? null : index))}
                  >
                    <IconComp width={20} height={20} />
                  </button>
                ) : href === "#" ? (
                  <button
                    type="button"
                    className="dcg-dock-item"
                    disabled
                    aria-label={item.title}
                  >
                    <IconComp width={20} height={20} />
                  </button>
                ) : (
                  <Link
                    href={href}
                    className="dcg-dock-item"
                    data-active={isActive}
                    aria-label={item.title}
                    onClick={handleNavigate}
                  >
                    <IconComp width={20} height={20} />
                  </Link>
                )}

                <div className="dcg-dock-popup" data-open={isOpen}>
                  <div className="dcg-dock-popupBody">
                    <div className="px-2.5 pb-1.5 text-xs font-bold text-primary">
                      {item.title}
                    </div>
                    {hasChildren ? (
                      <nav className="flex flex-col gap-0.5" aria-label={item.title}>
                        <SidebarSubtree
                          items={children}
                          normalizedPathname={normalizedPathname}
                          openGroups={openGroups}
                          onToggleGroup={handleToggleGroup}
                          onNavigate={handleNavigate}
                          onInteract={cancelLeave}
                        />
                      </nav>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}

          <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />

          <button
            type="button"
            className="dcg-dock-exit"
            onClick={() => {
              setDockOpenIndex(null);
              onExitFullscreen();
            }}
            aria-label="Thoát chế độ toàn màn hình"
            title="Hiện lại thanh điều hướng (Esc)"
          >
            <DcgSparkIcon />
          </button>
        </div>
      ) : null}
    </aside>
  );
}
