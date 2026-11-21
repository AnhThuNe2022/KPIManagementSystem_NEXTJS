"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import {
  AppButton,
  AppForm,
  AppPasswordInput,
  AppTextInput,
  useAppToast,
} from "@/components/ds";
import { useAuth } from "@/features/auth/AuthProvider";
import { safeInternalRedirect } from "@/lib/security/redirect";

export function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const toast = useAppToast();

  const [mode, setMode] = useState<"login" | "forgot">(
    searchParams.get("forgot") === "1" ? "forgot" : "login",
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(
    searchParams.get("reset") === "success"
      ? "Đã đổi mật khẩu. Hãy đăng nhập bằng mật khẩu mới."
      : null,
  );
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nextFieldErrors: { username?: string; password?: string } = {};
    if (!username.trim()) nextFieldErrors.username = "Vui lòng nhập tên đăng nhập hoặc email.";
    if (!password) nextFieldErrors.password = "Vui lòng nhập mật khẩu.";
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        setError(data.message || "Tên đăng nhập hoặc mật khẩu không chính xác.");
        return;
      }

      await refresh();
      const target = safeInternalRedirect(searchParams.get("next"), "/dashboard");
      toast("success", "Đăng nhập thành công.");
      router.replace(target);
      router.refresh();
    } catch {
      setError("Không thể kết nối tới máy chủ. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    if (!forgotEmail.trim()) {
      setError("Vui lòng nhập địa chỉ email đã đăng ký.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Email: forgotEmail.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setError(data.message || "Không thể gửi yêu cầu khôi phục mật khẩu.");
        return;
      }
      setInfoMessage(
        data.message ||
          "Nếu email khớp với tài khoản, bạn sẽ nhận được liên kết có hiệu lực trong 10 phút.",
      );
      toast("success", "Đã gửi yêu cầu khôi phục mật khẩu.");
    } catch {
      setError("Không thể kết nối tới máy chủ. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === "forgot") {
    return (
      <div className="ds-fade-in flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-secondary">Khôi phục quyền truy cập</span>
          <h2
            id="auth-heading"
            className="text-[30px] font-extrabold leading-[1.15] tracking-[-0.03em] text-primary sm:text-[34px]"
          >
            Quên mật khẩu
          </h2>
          <p className="text-[14.5px] leading-relaxed text-secondary">
            Nhập email tài khoản để nhận liên kết đặt lại mật khẩu.
          </p>
        </div>

        {infoMessage ? (
          <Banner status="success" title="Đã gửi yêu cầu" description={infoMessage} />
        ) : null}
        {error ? <Banner status="error" title="Không thể thực hiện" description={error} /> : null}

        <form onSubmit={handleForgotPassword} className="flex flex-col gap-5" noValidate>
          <AppForm>
            <AppTextInput
              label="Email"
              type="email"
              size="lg"
              value={forgotEmail}
              onChange={(val) => {
                setForgotEmail(val);
                setError(null);
                setInfoMessage(null);
              }}
              placeholder="name@deoca.vn"
              autoComplete="email"
              isDisabled={submitting}
            />
          </AppForm>

          <div className="ds-auth-submit mt-1">
            <AppButton
              type="submit"
              label={submitting ? "Đang gửi yêu cầu..." : "Gửi email đặt lại"}
              variant="primary"
              size="lg"
              width="100%"
              endContent={<Mail className="h-[18px] w-[18px]" />}
              isLoading={submitting}
              isDisabled={submitting}
            />
          </div>
        </form>

        <div className="flex items-center">
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              setError(null);
              setInfoMessage(null);
              setMode("login");
            }}
            className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-accent ds-interactive hover:underline disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Quay lại đăng nhập</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ds-fade-in flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-secondary">Không gian làm việc của bạn</span>
        <h2
          id="auth-heading"
          className="text-[32px] font-extrabold leading-[1.15] tracking-[-0.03em] text-primary sm:text-[36px]"
        >
          Đăng nhập
        </h2>
        <p className="text-[14.5px] leading-relaxed text-secondary">
          Chào mừng trở lại! Cùng Đèo Cả bắt đầu một ngày làm việc hiệu quả.
        </p>
      </div>

      {infoMessage ? (
        <Banner status="success" title="Thông báo" description={infoMessage} />
      ) : null}
      {error ? <Banner status="error" title="Đăng nhập thất bại" description={error} /> : null}

      <form onSubmit={handleLogin} className="flex flex-col gap-5" noValidate>
        <AppForm>
          <AppTextInput
            label="Tài khoản"
            size="lg"
            value={username}
            onChange={(val) => {
              setUsername(val);
              setFieldErrors((prev) => ({ ...prev, username: undefined }));
            }}
            placeholder="Email hoặc tên đăng nhập"
            autoComplete="username"
            isDisabled={submitting}
            error={fieldErrors.username}
          />
          <AppPasswordInput
            label="Mật khẩu"
            size="lg"
            value={password}
            onChange={(val) => {
              setPassword(val);
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
            isDisabled={submitting}
            error={fieldErrors.password}
          />
        </AppForm>

        <div className="-mt-2 flex items-center justify-end">
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              setError(null);
              setInfoMessage(null);
              setFieldErrors({});
              setPassword("");
              if (username.includes("@")) setForgotEmail(username.trim());
              setMode("forgot");
            }}
            className="text-[13.5px] font-semibold text-accent ds-interactive hover:underline disabled:opacity-50"
          >
            Quên mật khẩu?
          </button>
        </div>

        <div className="ds-auth-submit">
          <AppButton
            type="submit"
            label={submitting ? "Đang đăng nhập..." : "Đăng nhập"}
            variant="primary"
            size="lg"
            width="100%"
            endContent={<ArrowRight className="h-[18px] w-[18px]" />}
            isLoading={submitting}
            isDisabled={submitting}
          />
        </div>
      </form>

      <details className="group text-[13.5px] text-secondary">
        <summary className="flex cursor-pointer list-none items-center justify-between py-1.5 font-medium ds-interactive hover:text-accent">
          <span>Bạn cần hỗ trợ đăng nhập?</span>
          <span className="transition-transform group-open:rotate-90" aria-hidden="true">
            ↗
          </span>
        </summary>
        <p className="mt-2 rounded-xl border border-border bg-surface/85 px-4 py-3 text-[13px] leading-relaxed">
          Nếu chưa có tài khoản hoặc không nhận được email đặt lại mật khẩu, vui lòng liên hệ bộ
          phận CNTT của đơn vị.
        </p>
      </details>
    </div>
  );
}
