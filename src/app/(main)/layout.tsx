import React from "react";
import { cookies } from "next/headers";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserMenu } from "@/features/auth/components/user-menu";
import { appConfig } from "@/config/app";
import { Sidebar } from "@/features/layout/components/sidebar";

export default async function MainLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const userName = (await cookies()).get(appConfig.userNameCookieName)?.value ?? "Người dùng";

  return (
    <div className="min-h-screen bg-[rgb(var(--color-page))] text-[rgb(var(--color-text))]">
      <header className="sticky top-0 z-30 h-16 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface)/.88)] backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-2 pl-16 pr-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--color-brand))] font-bold text-white shadow-sm">K</div><span className="hidden text-lg font-bold tracking-tight sm:inline">KPI Management</span></div>
          <div className="flex items-center gap-4"><ThemeToggle /><div className="border-l border-[rgb(var(--color-border))] pl-3"><UserMenu userName={userName} /></div></div>
        </div>
      </header>
      <div className="flex"><Sidebar /><main className="min-w-0 flex-1 px-4 py-6 sm:p-6 lg:p-8"><div className="mx-auto max-w-6xl">{children}</div></main></div>
    </div>
  );
}
