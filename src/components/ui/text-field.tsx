import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; endAdornment?: React.ReactNode };
export function TextField({ label, error, endAdornment, id, className = "", ...props }: Props) {
  return <label className="block" htmlFor={id}><span className="mb-2 block text-sm font-medium text-[rgb(var(--color-text))]">{label}</span><span className="relative block"><input id={id} className={`h-11 w-full rounded-lg border bg-[rgb(var(--color-surface))] px-3 text-sm outline-none transition placeholder:text-[rgb(var(--color-muted))] focus:border-[rgb(var(--color-brand))] focus:ring-4 focus:ring-[rgb(var(--color-brand)/.12)] ${endAdornment ? "pr-12" : ""} ${error ? "border-[rgb(var(--color-accent))]" : "border-[rgb(var(--color-border))]"} ${className}`} {...props}/>{endAdornment}</span>{error && <span className="mt-1.5 block text-xs text-[rgb(var(--color-accent))]">{error}</span>}</label>;
}
