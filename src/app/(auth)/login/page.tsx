import React, { Suspense } from "react";
import { LoadingOverlay } from "@/components/ds";
import { LoginView } from "@/features/auth/components/LoginView";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingOverlay label="Đang tải trang đăng nhập..." />}>
      <LoginView />
    </Suspense>
  );
}
