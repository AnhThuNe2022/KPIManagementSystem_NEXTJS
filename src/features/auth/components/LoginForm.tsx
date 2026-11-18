"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/features/auth/AuthProvider";
import { useLoginCinema } from "@/features/auth/components/LoginCinema";

type Errors = { username?: string; password?: string };
export function LoginForm() {
  const router = useRouter(); const params = useSearchParams();
  const { refresh } = useAuth();
  const cinema = useLoginCinema();
  const [username, setUsername] = useState(""); const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState(""); const [loading, setLoading] = useState(false);

  useEffect(() => {
    cinema?.setArmed(Boolean(username.trim() && password));
  }, [cinema, username, password]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); 
    event.stopPropagation();

    const nextErrors: Errors = {};
    if (!username.trim()) nextErrors.username = "Vui lòng nhập tên đăng nhập hoặc email.";
    if (!password) nextErrors.password = "Vui lòng nhập mật khẩu.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      cinema?.pulseError();
      return;
    }
    setErrors({}); setServerError(""); setLoading(true);
    let succeeded = false;
   try {
  const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
          username: username.trim(),
          password,
      }),
  });


if (response.redirected) {
    throw new Error("API đăng nhập bị redirect ngoài dự kiến.");
}

const contentType = response.headers.get("content-type");

if (!contentType?.includes("application/json")) {
    throw new Error("API đăng nhập không trả về JSON hợp lệ.");
}

const data = await response.json();

if (!response.ok) {
    throw new Error(data.message || "Đăng nhập thất bại.");
}


  const next = params.get("next");
  const target =
    next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/dashboard";

  // Kích hoạt chuyển cảnh & preload sẵn route đích ngay khi cookie vừa được set
  succeeded = true;
  cinema?.triggerEnter();
  router.prefetch(target);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  await Promise.all([
    refresh(),
    reducedMotion ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, 340)),
  ]);

  router.replace(target);
} catch (error) {
  cinema?.pulseError();
  setServerError(
    error instanceof Error
      ? error.message
      : "Không thể đăng nhập. Vui lòng thử lại."
  );
} finally {
  if (!succeeded) setLoading(false);
}
  }
  return (
    <form className="login-form" method="post" onSubmit={submit} noValidate aria-label="Đăng nhập hệ thống KPI" aria-busy={loading}>
      <TextField id="username" name="username" label="Tài khoản" value={username} onChange={(event) => setUsername(event.target.value)} onFocus={() => cinema?.setFocusedField("username")} onBlur={() => cinema?.setFocusedField(null)} autoComplete="username" autoCapitalize="none" autoCorrect="off" enterKeyHint="next" spellCheck={false} placeholder="Email hoặc tên đăng nhập" className="login-input" error={errors.username} aria-invalid={Boolean(errors.username)} aria-describedby={errors.username ? "username-error" : undefined} disabled={loading} />
      <TextField id="password" name="password" label="Mật khẩu" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} onFocus={() => cinema?.setFocusedField("password")} onBlur={() => cinema?.setFocusedField(null)} autoComplete="current-password" enterKeyHint="done" placeholder="Nhập mật khẩu" className="login-input" error={errors.password} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : undefined} disabled={loading} endAdornment={
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setShowPassword(!showPassword)} className="login-password-toggle" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword} disabled={loading}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" />{showPassword && <path d="m3 3 18 18" />}</svg>
        </button>
      } />
      {serverError && <p className="login-server-error" role="alert">{serverError}</p>}
      <Button type="submit" loading={loading} className="login-submit" aria-busy={loading}>
        <span>Đăng nhập</span><span className="login-submit-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h15m-6-6 6 6-6 6" /></svg></span>
      </Button>
    </form>
  );
}
