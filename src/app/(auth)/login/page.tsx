import { Suspense } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <main className="relative grid min-h-screen bg-[rgb(var(--color-page))] lg:grid-cols-[1.1fr_.9fr]">
      <div className="absolute right-6 top-6 z-10"><ThemeToggle /></div>
      <section className="hidden bg-[rgb(var(--color-brand))] p-12 text-[rgb(var(--color-on-brand))] lg:flex lg:flex-col lg:justify-between">
        <div className="text-xl font-bold tracking-tight">DCG</div>
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[.2em] text-[rgb(var(--color-on-brand-subtle))]">KPI Management System</p>
          <h1 className="max-w-lg text-5xl font-semibold leading-tight">Đo lường rõ ràng. Phát triển bền vững.</h1>
          <p className="mt-6 max-w-md leading-7 text-[rgb(var(--color-on-brand-muted))]">Nền tảng quản trị mục tiêu và hiệu suất dành cho đội ngũ doanh nghiệp.</p>
        </div>
        <p className="text-sm text-[rgb(var(--color-on-brand-subtle))]">© {new Date().getFullYear()} DCG</p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md rounded-2xl bg-[rgb(var(--color-surface))] p-6 shadow-[var(--shadow-card)] sm:p-9">
          <div className="mb-8"><p className="mb-2 text-sm font-semibold text-[rgb(var(--color-accent))]">DCG KPI</p><h1 className="text-2xl font-semibold tracking-tight">Chào mừng trở lại</h1><p className="mt-2 text-sm leading-6 text-[rgb(var(--color-muted))]">Đăng nhập để tiếp tục vào hệ thống quản lý KPI.</p></div>
          <Suspense><LoginForm /></Suspense>
        </div>
      </section>
    </main>
  );
}
