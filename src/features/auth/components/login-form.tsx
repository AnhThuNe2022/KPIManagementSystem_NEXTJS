"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

type Errors = { username?: string; password?: string };
export function LoginForm() {
  const router = useRouter(); const params = useSearchParams();
  const [username, setUsername] = useState(""); const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const nextErrors: Errors = {};
    if (!username.trim()) nextErrors.username = "Vui lòng nhập tên đăng nhập hoặc email.";
    if (!password) nextErrors.password = "Vui lòng nhập mật khẩu.";
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    setErrors({}); setServerError(""); setLoading(true);
    try { 
    console.log("→ userName7878:", username);

      const response = await fetch("/api/auth/login", 
        { method: "POST", headers: { "Content-Type": "application/json" },
         credentials: "include", body: JSON.stringify({ username, password }) }); 
      const data = await response.json() as { message?: string }; if (!response.ok) throw new Error(data.message); router.replace(params.get("next") || "/dashboard"); router.refresh(); }
    catch (error) { setServerError(error instanceof Error ? error.message : "Không thể đăng nhập. Vui lòng thử lại."); }
    finally { setLoading(false); }
  }
  return <form className="space-y-5" onSubmit={submit} noValidate><TextField id="username" label="Tên đăng nhập hoặc email" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="Nhập tên đăng nhập hoặc email" error={errors.username}/><TextField id="password" label="Mật khẩu" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Nhập mật khẩu" error={errors.password} endAdornment={<button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 text-xs font-medium text-[rgb(var(--color-brand))] hover:underline" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{showPassword ? "Ẩn" : "Hiện"}</button>}/>{serverError && <p className="rounded-lg border border-[rgb(var(--color-accent)/.25)] bg-[rgb(var(--color-accent)/.08)] px-3 py-2 text-sm text-[rgb(var(--color-accent))]" role="alert">{serverError}</p>}<Button type="submit" loading={loading}>Đăng nhập</Button></form>;
}
