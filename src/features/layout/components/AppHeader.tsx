"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon, HomeIcon } from "@radix-ui/react-icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { UserMenu } from "@/features/auth/components/UserMenu";
import { menuHref, useMyMenus } from "@/features/menus/components/MenuAccessGuard";
import type { MenuDto } from "@/features/menus/types";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { WorkspaceSwitcherButton } from "@/features/workspace/components/WorkspacePortal";
import "./AppHeader.css";

// Only for routes not directly listed in /api/menus/my or dynamic detail pages.
const fallbackPages: Record<string, readonly string[]> = {
  "/dashboard": ["Dashboard"],
  "/admin/UserInfor": ["Quản trị hệ thống", "Quản lý nhân viên"],
  "/user-infor": ["Thông tin chung", "Thông tin tài khoản cá nhân"],
  "/my-evaluation": ["Đánh giá", "Bản đánh giá của tôi"],
  "/notifications": ["Thông báo"],
  "/condition-assignments": ["Quản lý", "Phân công xử lý điều kiện"],
  "/summary/summary-list-detail/HrSummary": ["HR tổng hợp", "Chi tiết tổng hợp"],
  "/summary/summary-list-detail/SummaryDirector": ["Tổng hợp cấp cao", "Chi tiết tổng hợp"],
};

function cleanRoutePath(path: string): string {
  return (path.split(/[?#]/)[0].replace(/\/+$/, "") || "/").toLowerCase();
}

function findMenuTrail(menus: MenuDto[], targetPath: string): string[] | null {
  for (const menu of menus) {
    const href = menuHref(menu.url);
    if (href !== "#" && cleanRoutePath(href) === targetPath) {
      return [menu.title];
    }
    if (menu.children?.length) {
      const childTrail = findMenuTrail(menu.children, targetPath);
      if (childTrail) return [menu.title, ...childTrail];
    }
  }
  return null;
}

function findFallbackTrail(targetPath: string): readonly string[] | null {
  for (const [path, trail] of Object.entries(fallbackPages)) {
    const clean = cleanRoutePath(path);
    if (targetPath === clean || targetPath.startsWith(clean + "/")) {
      return trail;
    }
  }
  return null;
}

export function AppHeader({ userName }: { userName: string }) {
  const pathname = usePathname();
  const { navigation, allMenus } = useMyMenus();
  const trail = useMemo(() => {
    const target = cleanRoutePath(pathname);
    return findMenuTrail(navigation, target) ?? findMenuTrail(allMenus, target) ?? findFallbackTrail(target);
  }, [allMenus, navigation, pathname]);
  return (
    <header className="app-header__header">
      <Link href="/dashboard" className="app-header__brand" aria-label="Đèo Cả KPI — Trang tổng quan">
        <span className="app-header__logo">
          <Image src="/brand/deoca-icon.svg" alt="" width={44} height={44} priority />
        </span>
        <span className="app-header__brandText">
          <span className="app-header__title">Hệ thống KPI</span>
          <span className="app-header__company">ĐÈO CẢ GROUP</span>
        </span>
      </Link>

      {trail && trail.length > 0 && (
        <nav className="app-header__breadcrumbs" aria-label="Đường dẫn trang">
          <ol>
            <li><Link href="/dashboard" aria-label="Trang tổng quan"><HomeIcon aria-hidden="true" /></Link></li>
            {trail.map((label, index) => {
              const isLast = index === trail.length - 1;
              return (
                <li key={`${index}-${label}`} aria-current={isLast ? "page" : undefined}>
                  <ChevronRightIcon aria-hidden="true" />
                  <span title={isLast ? label : undefined}>{label}</span>
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="app-header__actions">
        <WorkspaceSwitcherButton />
        <div className="app-header__tools">
          <NotificationBell />
          <ThemeToggle />
        </div>
        <div className="app-header__account">
          <UserMenu userName={userName} />
        </div>
      </div>
    </header>
  );
}
