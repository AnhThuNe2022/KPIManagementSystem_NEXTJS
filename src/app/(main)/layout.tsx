import React from "react";
import { cookies } from "next/headers";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserMenu } from "@/features/auth/components/user-menu";
import { appConfig } from "@/config/app";

const navigation = ["Dashboard", "Đánh giá KPI", "Nhân sự", "Báo cáo"];

export default async function MainLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const userName = (await cookies()).get(appConfig.userNameCookieName)?.value ?? "Người dùng";

  return (
    <div className="min-h-screen bg-[rgb(var(--color-page))] text-[rgb(var(--color-text))]">
      <header className="sticky top-0 z-30 h-16 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface)/.88)] backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgb(var(--color-brand))] font-bold text-white shadow-sm">K</div><span className="text-lg font-bold tracking-tight">KPI Management</span></div>
          <div className="flex items-center gap-4"><ThemeToggle /><div className="border-l border-[rgb(var(--color-border))] pl-3"><UserMenu userName={userName} /></div></div>
        </div>
      </header>
      <div className="flex"><aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 border-r border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] lg:block"><nav className="flex flex-col gap-1 p-4"><p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--color-muted))]">Tổng quan</p>{navigation.map((item, index) => <a key={item} href="#" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${index === 0 ? "bg-[rgb(var(--color-brand)/.12)] text-[rgb(var(--color-brand))]" : "text-[rgb(var(--color-muted))] hover:bg-[rgb(var(--color-brand)/.08)] hover:text-[rgb(var(--color-brand))]"}`}>{item}</a>)}</nav></aside><main className="min-w-0 flex-1 p-8"><div className="mx-auto max-w-6xl">{children}</div></main></div>
    </div>
  );
}
