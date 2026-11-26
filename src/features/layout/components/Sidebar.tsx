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
import type { MenuDto } from "@/features/menus/types";
import { menuHref, useMyMenus } from "@/features/menus/components/MenuAccessGuard";
import "./Sidebar.css";

const NavigationIcon = dynamic(() => import("@/features/menus/components/MenuIcon").then(module => module.MenuIcon), {
  loading: () => <HamburgerMenuIcon className="sidebar__icon" aria-hidden="true" />,
});

function containsPath(menu: MenuDto, pathname: string): boolean {
  return menuHref(menu.url).split(/[?#]/)[0] === pathname || menu.children?.some(child => containsPath(child, pathname));
}

function DcgSparkIcon() {
  return (
    <svg className="sidebar__dcgSparkIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path className="is-red" d="M6.2 1.8 13.4 9H10.1L6.2 5.1V1.8ZM17.8 1.8V5.1L15.1 7.8H11.8L17.8 1.8Z" />
      <path className="is-blue" d="M1.8 6.8H6.1L10.3 12 6.1 17.2H1.8L6 12 1.8 6.8ZM22.2 6.8H17.9L13.7 12l4.2 5.2h4.3L18 12l4.2-5.2Z" />
      <path className="is-red" d="M6.8 22.2v-4.3L12 13.7l5.2 4.2v4.3L12 18l-5.2 4.2Z" />
    </svg>
  );
}

export function Sidebar() {
  const { navigation, loading, error, reload } = useMyMenus();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [selectedPathname, setSelectedPathname] = useOptimistic(pathname);
  const selectedGroupIndex = navigation.findIndex(item => item.id === selectedGroupId && containsPath(item, selectedPathname));
  const activeIndex = selectedGroupIndex >= 0 ? selectedGroupIndex : navigation.findIndex(item => containsPath(item, selectedPathname));
  const [collapsed, setCollapsed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [dockOpenIndex, setDockOpenIndex] = useState<number | null>(null);
  const [dockCompactLeft, setDockCompactLeft] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [highlightOffset, setHighlightOffset] = useState(0);
  const [flyoutTop, setFlyoutTop] = useState(0);
  const [lastFlyoutIndex, setLastFlyoutIndex] = useState(Math.max(activeIndex, 0));
  const sidebarRef = useRef<HTMLElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const mobileDialogRef = useRef<HTMLDialogElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightedIndex = hoveredIndex ?? focusedIndex ?? Math.max(activeIndex, 0);
  const visiblyCollapsed = collapsed && !mobileOpen;
  const visiblyFullscreen = fullscreen && collapsed && !mobileOpen;
  const flyoutIndex = visiblyCollapsed && !visiblyFullscreen ? (hoveredIndex ?? focusedIndex) : null;
  const flyoutItem = visiblyCollapsed && !visiblyFullscreen ? navigation[flyoutIndex ?? lastFlyoutIndex] : null;

  useEffect(() => {
    setHoveredIndex(null);
    setFocusedIndex(null);
    setLastFlyoutIndex(0);
  }, [navigation]);

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

  useEffect(() => {
    if (!visiblyFullscreen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!dockRef.current?.contains(event.target as Node)) {
        setDockOpenIndex(null);
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (dockOpenIndex !== null) setDockOpenIndex(null);
      else setFullscreen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [visiblyFullscreen, dockOpenIndex]);

  useEffect(() => {
    if (!visiblyFullscreen) {
      setDockCompactLeft(null);
      return;
    }
    const measureFloatingBar = () => {
      const bar = document.querySelector<HTMLElement>(".floating-selection-bar__pill, .summary-detail__taskStatus");
      if (!bar) {
        setDockCompactLeft(null);
        return;
      }
      if (bar.offsetWidth <= 0 || bar.offsetHeight <= 0) {
        setDockCompactLeft(null);
        return;
      }
      const parentLeft = (bar.offsetParent as HTMLElement | null)?.getBoundingClientRect().left ?? 0;
      const settledRight = parentLeft + bar.offsetLeft + bar.offsetWidth;
      const nextLeft = Math.min(Math.round(settledRight + 14), window.innerWidth - 68);
      setDockCompactLeft(nextLeft);
      setDockOpenIndex(null);
    };
    measureFloatingBar();
    const mutationObserver = new MutationObserver(measureFloatingBar);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    const resizeObserver = new ResizeObserver(measureFloatingBar);
    const currentBar = document.querySelector<HTMLElement>(".floating-selection-bar__pill, .summary-detail__taskStatus");
    if (currentBar) resizeObserver.observe(currentBar);
    window.addEventListener("resize", measureFloatingBar);
    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureFloatingBar);
    };
  }, [visiblyFullscreen]);

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
    setDockOpenIndex(null);
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
        className: "sidebar__subitem",
        onPointerEnter: () => { cancelReturn(); setHoveredIndex(index); },
        onFocus: (event: FocusEvent<HTMLElement>) => {
          if (event.currentTarget.matches(":focus-visible")) setFocusedIndex(index);
        },
      };
      const content = <><NavigationIcon name={child.icon} fallback /><span>{child.title}</span>{hasChildren && <ChevronDownIcon className="sidebar__nestedChevron" data-open={open} aria-hidden="true" />}</>;
      return <div key={child.id}>
        {hasChildren ? <button {...interaction} type="button" aria-expanded={open} aria-controls={submenuId} onClick={() => setOpenGroups(value => ({ ...value, [child.id]: !open }))}>{content}</button>
          : href === "#" ? <button {...interaction} type="button" disabled title="Menu chưa có đường dẫn">{content}</button>
          : <Link {...interaction} href={href} aria-current={containsPath(child, selectedPathname) ? "page" : undefined} onNavigate={event => navigate(event, href, index)}>{content}</Link>}
        {hasChildren && <div id={submenuId} className="sidebar__nestedMenu" hidden={!open}>{renderSubitems(child, index)}</div>}
      </div>;
    });
  }

  const sidebar = (
    <aside
      ref={sidebarRef}
      className="sidebar__sidebar"
      data-collapsed={visiblyCollapsed}
      data-fullscreen={visiblyFullscreen}
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
      <div className="sidebar__frame">
        <div className="sidebar__surface">
          <div className="sidebar__header">
            <p className="sidebar__sectionLabel">
              <span>Công việc</span>
              <i aria-hidden="true" />
            </p>
            <button
              type="button"
              className="sidebar__collapse"
              onClick={() => {
                if (mobileOpen) {
                  setMobileOpen(false);
                  return;
                }
                cancelReturn();
                setCollapsed((value) => {
                  if (value) setFullscreen(false);
                  return !value;
                });
                setDockOpenIndex(null);
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
                    <path className="sidebar__collapseArrow" d="m16 9-3 3 3 3" />
                  </>
                )}
              </svg>
            </button>
          </div>

          <nav
            ref={navRef}
            id="workspace-navigation"
            className="sidebar__navigation"
            aria-label="Điều hướng chính"
            style={{ "--highlight-offset": `${highlightOffset}px` } as CSSProperties}
          >
            {!navigation.length && <div className="sidebar__menuStatus" role={error ? "alert" : "status"}>
              <p>{error || (loading ? "Đang tải menu…" : "Tài khoản chưa có menu được cấp.")}</p>
              {error && <button type="button" onClick={reload}>Thử lại</button>}
            </div>}
            {!!navigation.length && <div className="sidebar__indicator" aria-hidden="true">
              <span className="sidebar__cutout">
                <span className="sidebar__recessShadow" />
              </span>
            </div>}
            {navigation.map((item, index) => {
              const hasChildren = item.children.length > 0;
              const href = menuHref(item.url);
              const groupOpen = openGroups[item.id] ?? containsPath(item, selectedPathname);
              const submenuId = `sidebar-submenu-${item.id}`;
              const interaction = {
                className: "sidebar__item",
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
                  <NavigationIcon name={item.icon} className="sidebar__icon" fallback />
                  <span className="sidebar__label">{item.title}</span>
                  {hasChildren ? (
                    <svg
                      className="sidebar__groupChevron"
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
                      className="sidebar__itemArrow"
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
                <div key={item.id} className="sidebar__group">
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
                      className="sidebar__submenu"
                      data-open={groupOpen}
                      inert={!groupOpen || visiblyCollapsed}
                    >
                      <div className="sidebar__submenuInner">
                        <div className="sidebar__submenuContent">{renderSubitems(item, index)}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="sidebar__footer">
            <div className="sidebar__footerArt" aria-hidden="true" />
            <button
              type="button"
              className="sidebar__fullscreenTrigger"
              onClick={() => {
                cancelReturn();
                setHoveredIndex(null);
                setFocusedIndex(null);
                setDockOpenIndex(null);
                setFullscreen(true);
              }}
              aria-label="Chế độ toàn màn hình"
              title="Chế độ toàn màn hình"
              tabIndex={visiblyCollapsed && !visiblyFullscreen ? 0 : -1}
            >
              <DcgSparkIcon />
            </button>
            <span className="sidebar__footerRule" aria-hidden="true" />
            <p>
              Nghĩ khác biệt.
              <br />
              <strong>Tạo cách biệt.</strong>
            </p>
            <span className="sidebar__footerMonogram" aria-hidden="true">
              DCG
            </span>
          </div>
        </div>
      </div>
      {flyoutItem && (
        <div
          ref={flyoutRef}
          id="sidebar-flyout"
          className="sidebar__flyout"
          data-open={flyoutIndex !== null}
          inert={flyoutIndex === null}
          style={{ "--flyout-top": `${flyoutTop}px` } as CSSProperties}
        >
          <span className="sidebar__flyoutArrow" aria-hidden="true">
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
          <div className="sidebar__flyoutBody">
            {flyoutItem.children.length > 0 ? (
              <nav className="sidebar__flyoutLinks" aria-label={flyoutItem.title}>
                {renderSubitems(flyoutItem, flyoutIndex ?? lastFlyoutIndex)}
              </nav>
            ) : (
              <span className="sidebar__flyoutHint">{flyoutItem.title}</span>
            )}
          </div>
        </div>
      )}
      {visiblyFullscreen && (
        <div
          ref={dockRef}
          className="sidebar__dock"
          data-compact={dockCompactLeft !== null}
          style={dockCompactLeft !== null ? ({ "--dock-compact-left": `${dockCompactLeft}px` } as CSSProperties) : undefined}
          role="toolbar"
          aria-label="Thanh điều hướng nhanh toàn màn hình"
        >
          <div className="sidebar__dockItems">
            {navigation.map((item, index) => {
              const hasChildren = item.children.length > 0;
              const href = menuHref(item.url);
              const isActive = activeIndex === index;
              const isOpen = dockOpenIndex === index;
              return (
                <div
                  key={item.id}
                  className="sidebar__dockGroup"
                  onPointerEnter={(event) => {
                    if (event.pointerType === "touch") return;
                    cancelReturn();
                    setDockOpenIndex(index);
                  }}
                  onPointerLeave={() => {
                    cancelReturn();
                    leaveTimer.current = setTimeout(() => {
                      setDockOpenIndex((current) => (current === index ? null : current));
                    }, 160);
                  }}
                >
                  {hasChildren ? (
                    <button
                      type="button"
                      className="sidebar__dockItem"
                      data-active={isActive}
                      data-open={isOpen}
                      aria-label={item.title}
                      aria-expanded={isOpen}
                      onClick={() => setDockOpenIndex((current) => (current === index ? null : index))}
                    >
                      <NavigationIcon name={item.icon} className="sidebar__icon" fallback />
                    </button>
                  ) : href === "#" ? (
                    <button
                      type="button"
                      className="sidebar__dockItem"
                      disabled
                      title="Menu chưa có đường dẫn"
                      aria-label={item.title}
                    >
                      <NavigationIcon name={item.icon} className="sidebar__icon" fallback />
                    </button>
                  ) : (
                    <Link
                      href={href}
                      className="sidebar__dockItem"
                      data-active={isActive}
                      aria-label={item.title}
                      aria-current={isActive ? "page" : undefined}
                      onNavigate={(event) => {
                        setDockOpenIndex(null);
                        navigate(event, href, index);
                      }}
                    >
                      <NavigationIcon name={item.icon} className="sidebar__icon" fallback />
                    </Link>
                  )}
                  <div className="sidebar__dockPopup" data-open={isOpen} inert={!isOpen}>
                    <div className="sidebar__dockPopupBody">
                      <span className="sidebar__dockPopupTitle">{item.title}</span>
                      {hasChildren && (
                        <nav className="sidebar__dockPopupLinks" aria-label={item.title}>
                          {renderSubitems(item, index)}
                        </nav>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <span className="sidebar__dockDivider" aria-hidden="true" />
          <button
            type="button"
            className="sidebar__dockExit"
            onClick={() => {
              setDockOpenIndex(null);
              setFullscreen(false);
            }}
            aria-label="Thoát chế độ toàn màn hình"
            title="Thoát toàn màn hình (Esc)"
          >
            <DcgSparkIcon />
          </button>
        </div>
      )}
    </aside>
  );

  return (
    <>
      <button
        type="button"
        className="sidebar__mobileToggle"
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
        className="sidebar__mobileDialog"
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
