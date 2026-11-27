"use client";

import { useMyMenus } from "@/features/menus/components/MenuAccessGuard";

export default function B2SalaryEvaluationPage() {
  const { activeWorkspaceName } = useMyMenus();

  return (
    <section className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-2xl items-center justify-center py-8">
      <div className="w-full rounded-2xl border border-[rgb(var(--color-border)/0.85)] bg-[rgb(var(--color-surface))] p-8">
        <span className="inline-flex items-center gap-2 rounded-lg bg-[rgb(var(--color-brand)/0.09)] px-3 py-1 text-xs font-semibold text-[rgb(var(--color-brand))]">
          Workspace 2 · {activeWorkspaceName || "Đánh giá P2"}
        </span>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-[rgb(var(--color-text))] sm:text-3xl">
          Đánh giá P2
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-[rgb(var(--color-muted))]">
          Màn hình nghiệp vụ Đánh giá P2 đang sẵn sàng tích hợp tại đường dẫn này.
        </p>
      </div>
    </section>
  );
}
