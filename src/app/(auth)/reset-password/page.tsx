import { Suspense } from "react";
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu | Đèo Cả KPI",
  icons: { icon: "/brand/deoca-icon.svg" },
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return (
    <>
      <h2 id="auth-heading">Đặt lại mật khẩu</h2>
      <Suspense fallback={<div className="login-form-placeholder" aria-hidden="true" />}>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}
