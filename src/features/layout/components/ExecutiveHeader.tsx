"use client";

import React from "react";
import Link from "next/link";
import { Avatar } from "@astryxdesign/core/Avatar";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import {
  ChevronDown,
  ChevronRight,
  Home,
  LogOut,
  Maximize2,
  Menu,
  Minimize2,
  Moon,
  Sun,
  User,
} from "lucide-react";
import { useColorMode } from "@/components/ds";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { getInitials } from "@/lib/format/formatters";

export interface HeaderBreadcrumb {
  label: string;
  href?: string;
}

export function ExecutiveHeader({
  userName,
  breadcrumbs,
  isFullscreen,
  onToggleFullscreen,
  onOpenMobileNav,
  onLogout,
}: {
  userName: string;
  breadcrumbs: HeaderBreadcrumb[];
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenMobileNav: () => void;
  onLogout: () => void;
}) {
  const { resolvedMode, toggleMode } = useColorMode();

  const userMenuItems = [
    {
      id: "profile",
      label: "Thông tin cá nhân",
      icon: <User className="h-4 w-4" />,
      href: "/user-infor",
    },
    { type: "divider" as const },
    {
      id: "logout",
      label: "Đăng xuất",
      icon: <LogOut className="h-4 w-4" />,
      variant: "destructive" as const,
      onClick: onLogout,
    },
  ];

  return (
    <header className="dcg-header">
      {/* Left: Mobile drawer button + Signature Deoca Brand Wedge */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Mở menu điều hướng"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface/15 text-on-accent ds-interactive hover:bg-surface/25 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link
          href="/dashboard"
          className="dcg-header-brand"
          aria-label="Đèo Cả KPI — Trang tổng quan"
        >
          <span className="dcg-header-logo">
            {/* Official Deoca logo — colors strictly unaltered */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/deoca-icon.svg"
              alt="Đèo Cả Group"
              className="h-9 w-9 object-contain"
            />
          </span>
          <span className="dcg-header-brandText flex flex-col gap-0.5 min-w-0">
            <span className="dcg-header-title truncate">Hệ thống KPI</span>
            <span className="dcg-header-company truncate">ĐÈO CẢ GROUP</span>
          </span>
        </Link>
      </div>

      {/* Center: Executive Breadcrumbs */}
      {breadcrumbs.length > 0 ? (
        <nav
          aria-label="Đường dẫn trang"
          className="hidden min-w-0 flex-1 items-center text-sm text-secondary md:flex"
        >
          <ol className="flex min-w-0 items-center gap-2">
            <li className="shrink-0">
              <Link
                href="/dashboard"
                aria-label="Trang tổng quan"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary ds-interactive hover:bg-overlay-hover hover:text-primary"
              >
                <Home className="h-4 w-4" />
              </Link>
            </li>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <li
                  key={`${crumb.label}-${idx}`}
                  className={`flex min-w-0 items-center gap-2 ${
                    isLast ? "font-semibold text-primary" : "shrink-0 text-secondary"
                  }`}
                  aria-current={isLast ? "page" : undefined}
                >
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  {!isLast && crumb.href && crumb.href !== "#" ? (
                    <Link
                      href={crumb.href}
                      className="truncate rounded-md px-1.5 py-0.5 ds-interactive hover:bg-overlay-hover hover:text-primary"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="truncate" title={crumb.label}>
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : (
        <div className="hidden flex-1 md:block" />
      )}

      {/* Right: Recessed Tools Well + Account Pill */}
      <div className="flex shrink-0 items-center gap-4">
        <div className="dcg-header-tools">
          <NotificationBell triggerClassName="dcg-header-toolBtn" />

          <button
            type="button"
            onClick={toggleMode}
            className="dcg-header-toolBtn"
            aria-label={
              resolvedMode === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"
            }
            title={resolvedMode === "dark" ? "Giao diện sáng" : "Giao diện tối"}
          >
            {resolvedMode === "dark" ? (
              <Sun className="h-[18px] w-[18px]" />
            ) : (
              <Moon className="h-[18px] w-[18px]" />
            )}
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            data-active={isFullscreen}
            className="dcg-header-toolBtn hidden lg:grid"
            aria-label={isFullscreen ? "Hiện lại thanh điều hướng" : "Chế độ tập trung (ẩn sidebar)"}
            title={isFullscreen ? "Hiện lại thanh điều hướng (Esc)" : "Chế độ tập trung toàn màn hình"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-[18px] w-[18px]" />
            ) : (
              <Maximize2 className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>

        <div className="dcg-header-account">
          <DropdownMenu
            items={userMenuItems}
            alignment="end"
            placement="below"
            hasChevron={false}
            renderTrigger={(triggerProps) => (
              <button
                ref={triggerProps.ref}
                id={triggerProps.id}
                type="button"
                onClick={triggerProps.onClick}
                aria-expanded={triggerProps["aria-expanded"]}
                aria-haspopup={triggerProps["aria-haspopup"]}
                aria-controls={triggerProps["aria-controls"]}
                className="dcg-header-userBtn"
              >
                <Avatar name={getInitials(userName)} size="sm" shape="circle" />
                <div className="hidden min-w-0 flex-col sm:flex">
                  <span className="max-w-[160px] truncate text-sm font-bold leading-tight text-primary">
                    {userName}
                  </span>
                  <span className="text-xs leading-tight text-secondary">Tài khoản DCG</span>
                </div>
                <ChevronDown className="hidden h-3.5 w-3.5 text-secondary sm:block" />
              </button>
            )}
          />
        </div>
      </div>
    </header>
  );
}
