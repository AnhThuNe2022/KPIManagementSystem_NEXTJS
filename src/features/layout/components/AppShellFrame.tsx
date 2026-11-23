"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NavigationDrawer } from "@/components/ds";
import { useAuth } from "@/features/auth/AuthProvider";
import { useMyMenus } from "@/features/menus/components/MenuAccessGuard";
import { findMenuBreadcrumbTrail, normalizeMenuHref } from "@/features/menus/menuTree";
import { ExecutiveHeader, type HeaderBreadcrumb } from "./ExecutiveHeader";
import { ExecutiveSidebar } from "./ExecutiveSidebar";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "dcg-sidebar-collapsed";

const FALLBACK_BREADCRUMBS: Record<string, HeaderBreadcrumb[]> = {
  "/dashboard": [{ label: "Tổng quan" }],
  "/my-evaluation": [{ label: "Đánh giá" }, { label: "Đánh giá của tôi" }],
  "/user-infor": [{ label: "Thông tin chung" }, { label: "Tài khoản cá nhân" }],
  "/notifications": [{ label: "Thông báo" }],
  "/departments": [{ label: "Cơ cấu tổ chức" }, { label: "Phòng ban" }],
  "/condition-assignments": [{ label: "Quản lý" }, { label: "Phân quyền điều kiện" }],
  "/admin/menu": [{ label: "Quản trị" }, { label: "Quản lý Menu" }],
  "/admin/permission": [{ label: "Quản trị" }, { label: "Phân quyền RBAC" }],
  "/admin/userinfor": [{ label: "Quản trị hệ thống" }, { label: "Quản lý nhân viên" }],
  "/admin/evaluationlist": [{ label: "Nhân sự" }, { label: "Danh sách đánh giá toàn hệ thống" }],
  "/manager/pending": [{ label: "Quản lý" }, { label: "Chờ quản lý duyệt" }],
  "/manager/reviewed": [{ label: "Quản lý" }, { label: "Quản lý đã duyệt" }],
  "/manager/kpi-evaluation-periods": [{ label: "Quản lý" }, { label: "Kỳ đánh giá KPI" }],
  "/hr/pending": [{ label: "Nhân sự" }, { label: "HR chờ duyệt" }],
  "/hr/reviewed": [{ label: "Nhân sự" }, { label: "HR đã duyệt" }],
};

export function AppShellFrame({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/dashboard";
  const normalizedPathname = (pathname.replace(/\/+$/, "") || "/").toLowerCase();
  const router = useRouter();
  const { logout } = useAuth();
  const { navigation, isLoading, error, reload } = useMyMenus();

  const [collapsed, setCollapsed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restore saved collapse preference safely
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && typeof window.localStorage?.getItem === "function") {
        if (window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true") {
          setCollapsed(true);
        }
      }
    } catch {
      // Ignore storage error
    }
  }, []);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (!next) setFullscreen(false);
      try {
        if (typeof window !== "undefined" && typeof window.localStorage?.setItem === "function") {
          window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
        }
      } catch {
        // Ignore storage error
      }
      return next;
    });
  };

  const handleToggleFullscreen = () => {
    setFullscreen((prev) => {
      const next = !prev;
      if (next) setCollapsed(true);
      return next;
    });
  };

  const breadcrumbs = useMemo<HeaderBreadcrumb[]>(() => {
    const trail = findMenuBreadcrumbTrail(navigation, pathname);
    if (trail.length > 0) {
      return trail.map((node) => ({
        label: node.title,
        href: node.url ? normalizeMenuHref(node.url) : undefined,
      }));
    }
    if (normalizedPathname.startsWith("/summary/summary-list-detail/hrsummary")) {
      return [
        { label: "HR tổng hợp", href: "/summary/summary-list/HrSummary" },
        { label: "Chi tiết tổng hợp" },
      ];
    }
    if (normalizedPathname.startsWith("/summary/summary-list-detail/summarydirector")) {
      return [
        { label: "Tổng hợp cấp cao", href: "/summary/summary-list/SummaryDirector" },
        { label: "Chi tiết tổng hợp" },
      ];
    }
    return FALLBACK_BREADCRUMBS[normalizedPathname] ?? [];
  }, [navigation, normalizedPathname, pathname]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="dcg-shell">
      <ExecutiveHeader
        userName={userName}
        breadcrumbs={breadcrumbs}
        isFullscreen={fullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onOpenMobileNav={() => setMobileOpen(true)}
        onLogout={() => void handleLogout()}
      />

      <div className="flex items-start">
        <ExecutiveSidebar
          navigation={navigation}
          loading={isLoading}
          error={error}
          onReload={reload}
          normalizedPathname={normalizedPathname}
          collapsed={collapsed}
          fullscreen={fullscreen}
          onToggleCollapse={handleToggleCollapse}
          onEnterFullscreen={() => {
            setCollapsed(true);
            setFullscreen(true);
          }}
          onExitFullscreen={() => setFullscreen(false)}
        />

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Responsive Mobile Navigation Drawer backed by Astryx Drawer */}
      <NavigationDrawer
        isOpen={mobileOpen}
        onOpenChange={setMobileOpen}
        label="Menu điều hướng Đèo Cả KPI"
        width={304}
      >
        <ExecutiveSidebar
          navigation={navigation}
          loading={isLoading}
          error={error}
          onReload={reload}
          normalizedPathname={normalizedPathname}
          collapsed={false}
          fullscreen={false}
          onToggleCollapse={() => setMobileOpen(false)}
          onEnterFullscreen={() => {}}
          onExitFullscreen={() => {}}
          isMobileVariant
          onMobileClose={() => setMobileOpen(false)}
        />
      </NavigationDrawer>
    </div>
  );
}
