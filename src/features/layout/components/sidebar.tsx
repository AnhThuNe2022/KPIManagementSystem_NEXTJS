"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./sidebar.module.css";

type NavigationItem = {
  label: string;
  href: string;
  icon: ReactNode;
  children?: { label: string; href: string; icon: ReactNode }[];
};

const navigation: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
  },
  {
    label: "Thông tin chung",
    href: "#",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="9" r="3" />
        <path d="M5 18a7.5 7.5 0 0 1 14 0" />
      </>
    ),
    children: [
      {
        label: "Thông tin tài khoản cá nhân",
        href: "/user-infor",
        icon: (
          <>
            <rect x="3" y="5" width="18" height="15" rx="3" />
            <path d="M9 5V3h6v2m1 6h2m-2 4h2" />
            <circle cx="8" cy="11" r="2" />
            <path d="M5 17a3 3 0 0 1 6 0" />
          </>
        ),
      },
    ],
  },
  {
    label: "Nhập đánh giá",
    href: "#",
    icon: (
      <>
        <path d="M4 5h10M4 10h7M4 15h4m3 4 2.5-.5L21 11l-2-2-7.5 7.5L11 19Z" />
        <path d="m17 11 2 2" />
      </>
    ),
  },
  {
    label: "Bản đánh giá của tôi",
    href: "/my-evaluation",
    icon: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="3" />
        <path d="M9 4V3h6v1M9 10h6m-6 5 2 2 4-4" />
      </>
    ),
  },
  {
    label: "Quản lý",
    href: "#",
    icon: (
      <>
        <circle cx="9" cy="7" r="3" />
        <path d="M3 21v-3a6 6 0 0 1 9-5m4-2 1 .5 1-.5 1 1-.5 1 .5 1 1 .5v1l-1 .5-.5 1 .5 1-1 1-1-.5-1 .5-1-1 .5-1-.5-1-1-.5v-1l1-.5.5-1-.5-1 1-1Z" />
        <circle cx="17" cy="15.5" r="1.5" />
      </>
    ),
    children: [
      {
        label: "Danh sách NS chờ đánh giá",
        href: "/manager/pending",
        icon: (
          <>
            <rect x="4" y="4" width="13" height="17" rx="2" />
            <path d="M8 4V2h5v2M8 9h5m-5 4h3" />
            <circle cx="17" cy="17" r="4" />
            <path d="M17 15v2l1 1" />
          </>
        ),
      },
      {
        label: "Danh sách NS đã đánh giá",
        href: "/manager/reviewed",
        icon: (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="m7 12 3 3 7-7" />
          </>
        ),
      },
    ],
  },
  {
    label: "Quản lý Nhân sự",
    href: "#",
    icon: (
      <>
        <circle cx="12" cy="6" r="3" />
        <path d="M6 21v-3a6 6 0 0 1 12 0v3M3 21v-4a4 4 0 0 1 3-4m15 8v-4a4 4 0 0 0-3-4" />
        <path d="M5 5a3 3 0 0 0 0 6m14-6a3 3 0 0 1 0 6" />
      </>
    ),
    children: [
      {
        label: "Danh sách chờ nhận xét",
        href: "/hr/pending",
        icon: (
          <>
            <path d="M21 11v6a2 2 0 0 1-2 2H8l-5 3V5a2 2 0 0 1 2-2h8" />
            <path d="m13 12 2-.5L22 4.5 19.5 2l-7 7L12 12Z" />
          </>
        ),
      },
      {
        label: "Đã nhận xét",
        href: "/hr/reviewed",
        icon: (
          <>
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <path d="M8 8h3m-3 4h3m3 0 2 2 3-4M8 16h3" />
          </>
        ),
      },
    ],
  },
  {
    label: "HR tổng hợp",
    href: "#",
    icon: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M7 16v-4m5 4V8m5 8v-6" /></>,
    children: [{
      label: "Danh sách đánh giá",
      href: "/admin/evaluationList",
      icon: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6m-6 4h6m-6 4h3" /></>,
    }],
  },
  {
    label: "Cấu hình",
    href: "#",
    icon: <><path d="m10 3-1 3-3 1-3-1-1 4 2 2-1 3 3 2 3-1 2 2 4-1 1-3 3-1 1-4-3-1-1-3Z" /><circle cx="11" cy="11" r="3" /></>,
    children: [{
      label: "Quản lý Permission",
      href: "/admin/permission",
      icon: <><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" /><path d="m8 12 3 3 5-5" /></>,
    }],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const activeIndex = navigation.findIndex(
    (item) => item.href === pathname || item.children?.some((child) => child.href === pathname),
  );
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "Thông tin chung": true,
  });
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
  }, [highlightedIndex, mobileOpen, visiblyCollapsed, flyoutIndex]);

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

  function navigate() {
    cancelReturn();
    setMobileOpen(false);
    setHoveredIndex(null);
    setFocusedIndex(null);
  }

  function renderSubitems(item: NavigationItem, index: number) {
    return item.children?.map((child) => (
      <Link
        key={child.href}
        href={child.href}
        className={styles.subitem}
        aria-current={child.href === pathname ? "page" : undefined}
        onClick={navigate}
        onPointerEnter={() => {
          cancelReturn();
          setHoveredIndex(index);
        }}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) setFocusedIndex(index);
        }}
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
          {child.icon}
        </svg>
        <span>{child.label}</span>
      </Link>
    ));
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
          const firstLink = flyoutRef.current?.querySelector("a");
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
            <div className={styles.indicator} aria-hidden="true">
              <span className={styles.cutout}>
                <span className={styles.recessShadow} />
              </span>
            </div>
            {navigation.map((item, index) => {
              const groupOpen =
                openGroups[item.label] ??
                item.children?.some((child) => child.href === pathname) ??
                false;
              const submenuId = `sidebar-submenu-${index}`;
              const interaction = {
                className: styles.item,
                "data-highlighted": highlightedIndex === index,
                "aria-label": item.label,
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
                  <svg
                    className={styles.icon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.65"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {item.icon}
                  </svg>
                  <span className={styles.label}>{item.label}</span>
                  {item.children ? (
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
                <div key={item.label} className={styles.group}>
                  {item.children ? (
                    <button
                      {...interaction}
                      type="button"
                      aria-expanded={visiblyCollapsed ? flyoutIndex === index : groupOpen}
                      aria-controls={visiblyCollapsed ? "sidebar-flyout" : submenuId}
                      onClick={() => {
                        if (visiblyCollapsed) setFocusedIndex(index);
                        else setOpenGroups((value) => ({ ...value, [item.label]: !groupOpen }));
                      }}
                    >
                      {content}
                    </button>
                  ) : (
                    <Link
                      {...interaction}
                      href={item.href}
                      onClick={navigate}
                      aria-current={activeIndex === index ? "page" : undefined}
                    >
                      {content}
                    </Link>
                  )}
                  {item.children && (
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
            {flyoutItem.children ? (
              <nav className={styles.flyoutLinks} aria-label={flyoutItem.label}>
                {renderSubitems(flyoutItem, flyoutIndex ?? lastFlyoutIndex)}
              </nav>
            ) : (
              <span className={styles.flyoutHint}>{flyoutItem.label}</span>
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
