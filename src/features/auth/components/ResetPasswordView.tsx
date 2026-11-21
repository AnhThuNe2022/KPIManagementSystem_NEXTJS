"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AppButton, AppForm, AppPasswordInput, useAppToast } from "@/components/ds";

export function ResetPasswordView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useAppToast();

  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";
  const hasParams = Boolean(email.trim() && token.trim());

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasParams) {
      setError("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã thiếu tham số.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Email: email,
          Token: token,
          NewPassword: newPassword,
          ConfirmPassword: confirmPassword,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setError(data.message || "Không thể đặt lại mật khẩu. Liên kết có thể đã hết hạn.");
        return;
      }
      toast("success", "Đặt lại mật khẩu thành công.");
      router.replace("/login?reset=success");
    } catch {
      setError("Không thể kết nối tới máy chủ. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ds-fade-in flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-secondary">Khôi phục tài khoản</span>
        <h2
          id="auth-heading"
          className="text-[30px] font-extrabold leading-[1.15] tracking-[-0.03em] text-primary sm:text-[34px]"
        >
          Đặt lại mật khẩu
        </h2>
        <p className="text-[14.5px] leading-relaxed text-secondary">
          {email ? `Tạo mật khẩu mới cho ${email}.` : "Nhập mật khẩu mới cho tài khoản của bạn."}
        </p>
      </div>

      {!hasParams ? (
        <Banner
          status="warning"
          title="Thiếu thông tin xác thực"
          description="Liên kết đặt lại mật khẩu không đầy đủ (thiếu email hoặc token). Vui lòng gửi lại yêu cầu quên mật khẩu."
        />
      ) : null}
      {error ? (
        <Banner status="error" title="Không thể đặt lại mật khẩu" description={error} />
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <AppForm>
          <AppPasswordInput
            label="Mật khẩu mới"
            size="lg"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Tối thiểu 6 ký tự"
            autoComplete="new-password"
            isDisabled={submitting || !hasParams}
          />
          <AppPasswordInput
            label="Xác nhận mật khẩu mới"
            size="lg"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Nhập lại mật khẩu mới"
            autoComplete="new-password"
            isDisabled={submitting || !hasParams}
          />
        </AppForm>

        <div className="ds-auth-submit mt-1">
          <AppButton
            type="submit"
            label={submitting ? "Đang cập nhật..." : "Xác nhận đặt lại mật khẩu"}
            variant="primary"
            size="lg"
            width="100%"
            endContent={<ArrowRight className="h-[18px] w-[18px]" />}
            isLoading={submitting}
            isDisabled={submitting || !hasParams}
          />
        </div>
      </form>

      <div className="flex items-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-accent ds-interactive hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Quay lại đăng nhập</span>
        </Link>
      </div>
    </div>
  );
}
