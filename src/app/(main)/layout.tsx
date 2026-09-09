import React from "react";
import { cookies } from "next/headers";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserMenu } from "@/features/layout/user-menu";
import { appConfig } from "@/config/app";
import { getMenus } from "@/lib/api/menu";
import type { MenuDto } from "@/types/menu";
import { MenuItem } from "@/features/layout/menu-item";
export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();

  const userName =
    cookieStore.get(appConfig.userNameCookieName)?.value ??
    "Người dùng";

  const menus = await getMenus();

  return (
    <div className="min-h-screen bg-[rgb(var(--color-page))] text-[rgb(var(--color-text))]">
      
      {/* Header */}
      <header className="sticky top-0 z-30 h-16 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface)/.88)] backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgb(var(--color-brand))] font-bold text-white shadow-sm">
              K
            </div>

            <span className="text-lg font-bold tracking-tight">
              KPI Management
            </span>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />

            <div className="border-l border-[rgb(var(--color-border))] pl-3">
              <UserMenu userName={userName} />
            </div>
          </div>

        </div>
      </header>

      <div className="flex">

        {/* Sidebar */}
        <aside className="sticky top-16 hidden min-h-[calc(100vh-4rem)] w-64 border-r border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] lg:block">
          <nav className="flex flex-col gap-1 p-4">

            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--color-muted))]">
              Tổng quan
            </p>

            {menus
              .sort((a, b) => a.orderNo - b.orderNo)
              .map((menu) => (
                <MenuItem key={menu.id} menu={menu} />
              ))}

          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}