import React, { Suspense } from "react";
import type { Metadata } from "next";
import { LoadingOverlay } from "@/components/ds";
import { ResetPasswordView } from "@/features/auth/components/ResetPasswordView";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu | Đèo Cả Group",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingOverlay label="Đang tải..." />}>
      <ResetPasswordView />
    </Suspense>
  );
}
