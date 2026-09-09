"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UserMenu({ userName }: { userName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-3 rounded-lg p-1.5 text-left transition-colors hover:bg-[rgb(var(--color-brand)/.08)]"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgb(var(--color-brand)/.14)] text-sm font-semibold uppercase text-[rgb(var(--color-brand))]">{userName.charAt(0)}</div>
        <div className="hidden md:block">
          <p className="text-sm font-semibold leading-none">{userName}</p>
          <p className="mt-1 text-xs text-[rgb(var(--color-muted))]">Quản trị viên</p>
        </div>
        <svg className={`h-4 w-4 text-[rgb(var(--color-muted))] transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 min-w-44 rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-1 shadow-[var(--shadow-card)]" role="menu">
          <button
            type="button"
            onClick={logout}
            disabled={loading}
            className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-[rgb(var(--color-text))] transition-colors hover:bg-[rgb(var(--color-brand)/.08)] hover:text-[rgb(var(--color-brand))] disabled:cursor-not-allowed disabled:opacity-60"
            role="menuitem"
          >
            {loading ? "Đang đăng xuất..." : "Đăng xuất"}
          </button>
        </div>
      )}
    </div>
  );
}