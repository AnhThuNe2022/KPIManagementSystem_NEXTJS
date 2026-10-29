import { Suspense } from "react";

import { Permissions } from "@/features/permissions/Permissions";

export const metadata = { title: "Quản lý quyền | Đèo Cả", description: "Quản lý quyền truy cập, màn hình, vai trò và người dùng." };
export default async function PermissionPage() {
  return <Suspense fallback={<p role="status">Đang mở quản lý quyền…</p>}><Permissions /></Suspense>;
}
