import Link from "next/link";
import { HomeIcon } from "@radix-ui/react-icons";

export default function NotFound() {
  return (
    <section className="relative flex min-h-[calc(100vh-11rem)] w-full items-center justify-center overflow-hidden rounded-3xl border border-[rgb(var(--color-border)/0.55)] bg-[rgb(var(--color-surface)/0.7)] px-6 py-12 shadow-[var(--shadow-card)] sm:px-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute -right-16 -top-20 h-64 w-64 rounded-full border border-[rgb(var(--color-brand)/0.15)] sm:h-80 sm:w-80" />
        <span className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full border border-[rgb(var(--color-accent)/0.15)] sm:h-96 sm:w-96" />
        <span className="absolute left-[22%] top-[24%] h-3 w-3 rounded-full bg-[rgb(var(--color-accent)/0.7)]" />
        <span className="absolute bottom-[24%] right-[25%] h-2 w-2 rounded-full bg-[rgb(var(--color-brand)/0.7)]" />
      </div>

      <div className="relative z-10 max-w-xl text-center">
        <p className="font-mono text-7xl font-black tracking-[-0.08em] text-[rgb(var(--color-brand))] sm:text-9xl">
          404
        </p>
        <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-gradient-to-r from-[rgb(var(--color-button-start))] to-[rgb(var(--color-button-end))]" />
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-[rgb(var(--color-text))] sm:text-3xl">
          Không tìm thấy trang
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[rgb(var(--color-muted))] sm:text-base">
          Đường dẫn bạn vừa truy cập không tồn tại hoặc đã được thay đổi. Hãy quay về Dashboard để tiếp tục.
        </p>
        <Link
          href="/dashboard"
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[rgb(var(--color-button-start))] to-[rgb(var(--color-button-end))] px-5 py-3 text-sm font-semibold text-[rgb(var(--color-on-brand))] shadow-md transition hover:-translate-y-0.5 hover:opacity-95"
        >
          <HomeIcon className="h-4 w-4" aria-hidden="true" />
          Về Dashboard
        </Link>
      </div>
    </section>
  );
}
