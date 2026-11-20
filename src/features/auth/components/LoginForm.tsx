"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon, EnvelopeClosedIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/features/auth/AuthProvider";
import { request } from "@/lib/api/request";

type Errors = { username?: string; password?: string };

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [localView, setLocalView] = useState<"login" | "forgot">("login");
  const [returning, setReturning] = useState(false);
  const forgotButton = useRef<HTMLButtonElement>(null);

  const routeForgot = params.get("forgot") === "1";
  const activeForgot = routeForgot || localView === "forgot";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();

    const nextErrors: Errors = {};
    if (!username.trim()) nextErrors.username = "Vui lòng nhập tên đăng nhập hoặc email.";
    if (!password) nextErrors.password = "Vui lòng nhập mật khẩu.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setServerError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: username.trim(), password }),
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

      await refresh();

      const next = params.get("next");
      const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      router.replace(target);
      router.refresh();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Không thể đăng nhập. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  if (activeForgot) {
    return (
      <ForgotPasswordForm
        initialEmail={username.includes("@") ? username.trim() : ""}
        onBack={() => {
          setLocalView("login");
          setReturning(true);
          if (routeForgot) router.replace("/login");
          requestAnimationFrame(() => forgotButton.current?.focus());
        }}
      />
    );
  }

  return (
    <div className={returning ? "login-auth-swap" : undefined}>
      <p className="login-panel-kicker">Không gian làm việc của bạn</p>
      <h2 id="auth-heading">Đăng nhập</h2>
      <p className="login-panel-description">
        Chào mừng trở lại! Cùng Đèo Cả<br /> bắt đầu một ngày làm việc hiệu quả.
      </p>
      {params.get("reset") === "success" && (
        <p className="login-recovery-status login-reset-success" role="status">
          Đã đổi mật khẩu. Hãy đăng nhập bằng mật khẩu mới.
        </p>
      )}
      <form className="login-form" method="post" onSubmit={submit} noValidate aria-label="Đăng nhập hệ thống KPI" aria-busy={loading}>
        <TextField
          id="username"
          name="username"
          label="Tài khoản"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          enterKeyHint="next"
          spellCheck={false}
          placeholder="Email hoặc tên đăng nhập"
          className="login-input"
          error={errors.username}
          aria-invalid={Boolean(errors.username)}
          aria-describedby={errors.username ? "username-error" : undefined}
          disabled={loading}
        />
        <TextField
          id="password"
          name="password"
          label="Mật khẩu"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          enterKeyHint="done"
          placeholder="Nhập mật khẩu"
          className="login-input"
          error={errors.password}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
          disabled={loading}
          endAdornment={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="login-password-toggle"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-pressed={showPassword}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                <circle cx="12" cy="12" r="2.5" />
                {showPassword && <path d="m3 3 18 18" />}
              </svg>
            </button>
          }
        />
        <button
          ref={forgotButton}
          type="button"
          className="login-recovery-link login-forgot-link"
          onClick={() => {
            setPassword("");
            setShowPassword(false);
            setServerError("");
            setErrors({});
            setLocalView("forgot");
          }}
          disabled={loading}
        >
          Quên mật khẩu?
        </button>
        {serverError && <p className="login-server-error" role="alert">{serverError}</p>}
        <Button type="submit" loading={loading} className="login-submit" aria-busy={loading}>
          <span>Đăng nhập</span>
          <span className="login-submit-arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h15m-6-6 6 6-6 6" />
            </svg>
          </span>
        </Button>
      </form>
      <details className="login-support">
        <summary>Bạn cần hỗ trợ đăng nhập?<span aria-hidden="true">↗</span></summary>
        <p>Nếu chưa có tài khoản hoặc không nhận được email đặt lại mật khẩu, vui lòng liên hệ bộ phận CNTT của đơn vị.</p>
      </details>
    </div>
  );
}

function ForgotPasswordForm({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setSent(false);
    setError("");
    try {
      await request("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ Email: email.trim() }),
      });
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error && !cause.message.startsWith("API_ERROR") ? cause.message : "Chưa gửi được yêu cầu. Vui lòng thử lại.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="login-auth-swap">
      <h2 id="auth-heading">Quên mật khẩu</h2>
      <p className="login-panel-description">Nhập email tài khoản để nhận liên kết đặt lại mật khẩu.</p>
      <form className="login-form" method="post" onSubmit={submit} aria-labelledby="auth-heading" aria-busy={pending}>
        <TextField
          id="recovery-email"
          name="email"
          type="email"
          label="Email"
          value={email}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          required
          placeholder="Email của bạn"
          className="login-input"
          disabled={pending}
          onChange={(event) => {
            setEmail(event.target.value);
            setSent(false);
            setError("");
          }}
        />
        {error && <p className="login-server-error" role="alert">{error}</p>}
        {sent && (
          <p className="login-recovery-status" role="status">
            Nếu email khớp với tài khoản, bạn sẽ nhận được liên kết có hiệu lực trong 10 phút.
          </p>
        )}
        <Button type="submit" className="login-submit" disabled={pending}>
          <span>{pending ? "Đang gửi…" : "Gửi email"}</span>
          {!pending && <span className="login-submit-arrow"><EnvelopeClosedIcon aria-hidden="true" /></span>}
        </Button>
      </form>
      <button type="button" className="login-recovery-link login-recovery-back" onClick={onBack} disabled={pending}>
        <ArrowLeftIcon aria-hidden="true" /> Quay lại đăng nhập
      </button>
    </div>
  );
}

export function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get("email")?.trim() ?? "";
  const token = params.get("token") ?? "";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [mismatch, setMismatch] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const fields = new FormData(event.currentTarget);
    const password = String(fields.get("newPassword") ?? "");
    const confirm = String(fields.get("confirmPassword") ?? "");
    setError("");
    setMismatch(password !== confirm);
    if (password !== confirm) return;

    setPending(true);
    try {
      await request("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ Email: email, Token: token, NewPassword: password, ConfirmPassword: confirm }),
      });
      router.replace("/login?reset=success");
    } catch (cause) {
      setError(cause instanceof Error && !cause.message.startsWith("API_ERROR") ? cause.message : "Chưa đổi được mật khẩu. Vui lòng thử lại.");
      setPending(false);
    }
  }

  if (!email || !token.trim()) {
    return (
      <>
        <p className="login-panel-description">Liên kết thiếu thông tin đặt lại mật khẩu. Hãy yêu cầu một liên kết mới.</p>
        <Link className="login-recovery-link" href="/login?forgot=1" rel="noreferrer">
          Yêu cầu liên kết mới <ArrowRightIcon aria-hidden="true" />
        </Link>
      </>
    );
  }

  return (
    <>
      <p className="login-panel-description login-reset-description">
        Tạo mật khẩu mới cho <strong>{email}</strong>.
      </p>
      <form className="login-form" method="post" onSubmit={submit} aria-labelledby="auth-heading" aria-busy={pending}>
        <TextField id="reset-new-password" name="newPassword" type="password" label="Mật khẩu mới" autoComplete="new-password" required className="login-input" disabled={pending} />
        <TextField
          id="reset-confirm-password"
          name="confirmPassword"
          type="password"
          label="Xác nhận mật khẩu mới"
          autoComplete="new-password"
          required
          className="login-input"
          disabled={pending}
          error={mismatch ? "Hai mật khẩu chưa khớp." : undefined}
          aria-invalid={mismatch || undefined}
          aria-describedby={mismatch ? "reset-confirm-password-error" : undefined}
          onChange={() => setMismatch(false)}
        />
        {error && <p className="login-server-error" role="alert">{error}</p>}
        <Button type="submit" className="login-submit" disabled={pending}>
          <span>{pending ? "Đang cập nhật…" : "Đặt lại mật khẩu"}</span>
          {!pending && <span className="login-submit-arrow"><ArrowRightIcon aria-hidden="true" /></span>}
        </Button>
      </form>
      <Link href="/login?forgot=1" rel="noreferrer" className="login-recovery-link login-recovery-back">
        Yêu cầu liên kết mới <ArrowRightIcon aria-hidden="true" />
      </Link>
    </>
  );
}
