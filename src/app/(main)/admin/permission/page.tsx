import React, { Suspense } from "react";
import { LoadingOverlay } from "@/components/ds";
import { PermissionsView } from "@/features/permissions/components/PermissionsView";

export default function AdminPermissionPage() {
  return (
    <Suspense fallback={<LoadingOverlay label="Đang tải quản lý phân quyền..." />}>
      <PermissionsView />
    </Suspense>
  );
}
