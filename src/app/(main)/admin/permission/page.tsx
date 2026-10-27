import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { appConfig } from "@/config/app";
import { Permissions } from "@/features/permissions/Permissions";

export const metadata = { title: "Quản lý quyền | Đèo Cả", description: "Quản lý quyền truy cập, màn hình, vai trò và người dùng." };
export default async function PermissionPage() {
  if (!(await cookies()).has(appConfig.authCookieName)) redirect("/login?next=/admin/permission");
  return <Suspense fallback={<p role="status">Đang mở quản lý quyền…</p>}><Permissions /></Suspense>;
}
