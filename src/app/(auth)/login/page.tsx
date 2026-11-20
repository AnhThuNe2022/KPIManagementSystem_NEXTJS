import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Đăng nhập | Đèo Cả KPI",
  description: "Hệ thống quản trị mục tiêu và hiệu suất của Tập đoàn Đèo Cả.",
  icons: { icon: "/brand/deoca-icon.svg" },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<><h2 id="auth-heading">Đăng nhập</h2><div className="login-form-placeholder" aria-hidden="true" /></>}>
      <LoginForm />
    </Suspense>
  );
}
