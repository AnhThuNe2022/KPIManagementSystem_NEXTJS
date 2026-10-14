"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FocusEvent, type ReactNode } from "react";
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
  { label: "Dashboard", href: "/dashboard", icon: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></> },
  {
    label: "Thông tin chung", href: "#",
    icon: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="9" r="3" /><path d="M5 18a7.5 7.5 0 0 1 14 0" /></>,
    children: [{ label: "Thông tin tài khoản cá nhân", href: "#", icon: <><rect x="3" y="5" width="18" height="15" rx="3" /><path d="M9 5V3h6v2m1 6h2m-2 4h2" /><circle cx="8" cy="11" r="2" /><path d="M5 17a3 3 0 0 1 6 0" /></> }],
  },
  { label: "Nhập đánh giá", href: "#", icon: <><path d="M4 5h10M4 10h7M4 15h4m3 4 2.5-.5L21 11l-2-2-7.5 7.5L11 19Z" /><path d="m17 11 2 2" /></> },
  { label: "Bản đánh giá của tôi", href: "#", icon: <><rect x="5" y="4" width="14" height="17" rx="3" /><path d="M9 4V3h6v1M9 10h6m-6 5 2 2 4-4" /></> },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [generalOpen, setGeneralOpen] = useState(true);
  const [highlightOffset, setHighlightOffset] = useState(0);
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIndex = navigation.findIndex((item) => item.href === pathname);
  const highlightedIndex = hoveredIndex ?? focusedIndex ?? Math.max(activeIndex, 0);
  const visiblyCollapsed = collapsed && !previewExpanded;

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => {
      const item = itemRefs.current[highlightedIndex];
      if (item) setHighlightOffset(item.getBoundingClientRect().top - nav.getBoundingClientRect().top);
    };
    measure();
    // Accordion height changes must move the notch with the actual menu row.
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [highlightedIndex]);

  useEffect(() => () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  }, []);

  function cancelReturn() {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  }

  function scheduleReturn(sidebar: HTMLElement) {
    cancelReturn();
    // A short exit grace period prevents flicker when the pointer crosses an edge quickly.
    leaveTimer.current = setTimeout(() => {
      setHoveredIndex(null);
      setPreviewExpanded(sidebar.contains(document.activeElement) && Boolean(document.activeElement?.matches(":focus-visible")));
    }, 180);
  }

  return (
    <aside
      className={styles.sidebar}
      data-compact={collapsed}
      data-collapsed={visiblyCollapsed}
      aria-label="Thanh điều hướng"
      onPointerEnter={(event) => {
        if (event.pointerType === "touch") return;
        cancelReturn();
        setPreviewExpanded(true);
      }}
      onPointerLeave={(event) => scheduleReturn(event.currentTarget)}
      onFocusCapture={(event) => {
        cancelReturn();
        if (event.target.matches(":focus-visible")) setPreviewExpanded(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocusedIndex(null);
          scheduleReturn(event.currentTarget);
        }
      }}
    >
      <div className={styles.frame}>
        <div className={styles.surface}>
          <div className={styles.header}>
            <div className={styles.identity}>
              <span className={styles.mark} aria-hidden="true"><i /><i /><i /></span>
              <div><strong>Không gian KPI</strong><span>ĐÈO CẢ GROUP</span></div>
            </div>
            <button
              type="button"
              className={styles.collapse}
              onClick={() => {
                cancelReturn();
                setCollapsed((value) => !value);
                setPreviewExpanded(false);
              }}
              aria-label={collapsed ? "Giữ thanh điều hướng mở" : "Thu gọn thanh điều hướng"}
              aria-expanded={!visiblyCollapsed}
              aria-controls="workspace-navigation"
              title={collapsed ? "Giữ mở" : "Thu gọn"}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="4" /><path d="M9 4v16" /><path className={styles.collapseArrow} d="m16 9-3 3 3 3" /></svg>
            </button>
          </div>

          <p className={styles.sectionLabel}><span>Công việc</span><i aria-hidden="true" /></p>
          <nav
            ref={navRef}
            id="workspace-navigation"
            className={styles.navigation}
            aria-label="Điều hướng chính"
            style={{ "--highlight-offset": `${highlightOffset}px` } as CSSProperties}
          >
            <div className={styles.indicator} aria-hidden="true">
              <span className={styles.cutout}><span className={styles.recessShadow} /></span>
            </div>
            {navigation.map((item, index) => {
              const interaction = {
                className: styles.item,
                "data-highlighted": highlightedIndex === index,
                "aria-label": item.label,
                ref: (element: HTMLElement | null) => { itemRefs.current[index] = element; },
                onPointerEnter: () => {
                  cancelReturn();
                  setHoveredIndex(index);
                },
                onFocus: (event: FocusEvent<HTMLElement>) => setFocusedIndex(event.currentTarget.matches(":focus-visible") ? index : null),
              };
              const content = <>
                <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{item.icon}</svg>
                <span className={styles.label}>{item.label}</span>
                {item.children
                  ? <svg className={styles.groupChevron} data-open={generalOpen} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 8 4 4 4-4" /></svg>
                  : <svg className={styles.itemArrow} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 10h10m-4-4 4 4-4 4" /></svg>}
              </>;

              return <div key={item.label} className={styles.group}>
                {item.children
                  ? <button {...interaction} type="button" aria-expanded={generalOpen && !visiblyCollapsed} aria-controls="sidebar-general-submenu" onClick={() => setGeneralOpen((value) => !value)}>{content}</button>
                  : <Link {...interaction} href={item.href} aria-current={activeIndex === index ? "page" : undefined}>{content}</Link>}
                {item.children && <div id="sidebar-general-submenu" className={styles.submenu} data-open={generalOpen} inert={!generalOpen || visiblyCollapsed}>
                  <div className={styles.submenuInner}>
                    <div className={styles.submenuContent}>
                      {item.children.map((child) => <Link key={child.label} href={child.href} className={styles.subitem} onPointerEnter={interaction.onPointerEnter} onFocus={interaction.onFocus}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{child.icon}</svg>
                        <span>{child.label}</span>
                      </Link>)}
                    </div>
                  </div>
                </div>}
              </div>;
            })}
          </nav>

          <div className={styles.footer}>
            <div className={styles.footerArt} aria-hidden="true" />
            <span className={styles.footerRule} aria-hidden="true" />
            <p>Nghĩ khác biệt.<br /><strong>Tạo cách biệt.</strong></p>
            <span className={styles.footerMonogram} aria-hidden="true">DCG</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
