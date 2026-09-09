import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean };
export function Button({ children, loading, disabled, className = "", ...props }: Props) {
  return <button className={`inline-flex h-11 w-full items-center justify-center rounded-lg bg-[rgb(var(--color-brand))] px-4 font-semibold text-[rgb(var(--color-on-brand))] transition hover:bg-[rgb(var(--color-brand-strong))] focus:outline-none focus:ring-4 focus:ring-[rgb(var(--color-brand)/.2)] disabled:cursor-not-allowed disabled:opacity-60 ${className}`} disabled={disabled || loading} {...props}>{loading ? "Đang đăng nhập..." : children}</button>;
}
