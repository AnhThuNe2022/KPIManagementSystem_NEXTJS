import React from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navigation = ["Dashboard", "Đánh giá KPI", "Nhân sự", "Báo cáo"];

export default function MainLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[rgb(var(--color-page))] text-[rgb(var(--color-text))]">
      <header className="sticky top-0 z-30 h-16 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface)/.88)] backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgb(var(--color-brand))] font-bold text-white shadow-sm">K</div><span className="text-lg font-bold tracking-tight">KPI Management</span></div>
          <div className="flex items-center gap-4"><ThemeToggle /><button className="relative rounded-full p-2 text-[rgb(var(--color-muted))] transition-colors hover:bg-[rgb(var(--color-brand)/.08)] hover:text-[rgb(var(--color-brand))]" aria-label="Thông báo"><span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[rgb(var(--color-accent))]" /><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg></button><div className="flex items-center gap-3 border-l border-[rgb(var(--color-border))] pl-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgb(var(--color-brand)/.14)] text-sm font-semibold text-[rgb(var(--color-brand))]">U</div><div className="hidden text-left md:block"><p className="text-sm font-semibold leading-none">John Doe</p><p className="mt-1 text-xs text-[rgb(var(--color-muted))]">Quản trị viên</p></div></div></div>
        </div>
      </header>
      <div className="flex"><aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 border-r border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] lg:block"><nav className="flex flex-col gap-1 p-4"><p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--color-muted))]">Tổng quan</p>{navigation.map((item, index) => <a key={item} href="#" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${index === 0 ? "bg-[rgb(var(--color-brand)/.12)] text-[rgb(var(--color-brand))]" : "text-[rgb(var(--color-muted))] hover:bg-[rgb(var(--color-brand)/.08)] hover:text-[rgb(var(--color-brand))]"}`}>{item}</a>)}</nav></aside><main className="min-w-0 flex-1 p-8"><div className="mx-auto max-w-6xl">{children}</div></main></div>
    </div>
  );
}
