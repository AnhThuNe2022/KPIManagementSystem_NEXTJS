import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { appConfig } from "@/config/app";
import { DepartmentManagement } from "@/features/department/components/DepartmentManagement";

export default async function DepartmentsPage() {
  if (!(await cookies()).has(appConfig.authCookieName)) redirect("/login?next=/departments");
  return <DepartmentManagement />;
}
