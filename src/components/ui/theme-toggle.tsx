"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => setIsDark(document.documentElement.classList.contains("dark")), []);

  function toggleTheme() {
    const nextIsDark = !isDark;
    document.documentElement.classList.toggle("dark", nextIsDark);
    localStorage.setItem("dcg-theme", nextIsDark ? "dark" : "light");
    setIsDark(nextIsDark);
  }

  return <button type="button" onClick={toggleTheme} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] text-[rgb(var(--color-muted))] transition hover:border-[rgb(var(--color-brand)/.45)] hover:text-[rgb(var(--color-brand))] focus:outline-none focus:ring-4 focus:ring-[rgb(var(--color-brand)/.15)]" aria-label={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"} title={isDark ? "Giao diện sáng" : "Giao diện tối"}>{isDark ? <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="3.5" /><path strokeLinecap="round" d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.72 5.28l-1.42 1.42M6.7 17.3l-1.42 1.42M18.72 18.72l-1.42-1.42M6.7 6.7L5.28 5.28" /></svg> : <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M20.5 15.2A8.5 8.5 0 018.8 3.5 8.5 8.5 0 1020.5 15.2z" /></svg>}</button>;
}
