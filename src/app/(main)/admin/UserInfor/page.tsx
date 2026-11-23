import { EmployeeManagementView } from "@/features/user/components/EmployeeManagementView";

export const metadata = {
  title: "Quản lý nhân viên | Đèo Cả",
  description: "Tra cứu, lọc và quản lý hồ sơ nhân viên trong hệ thống KPI.",
};

export default function AdminUserInforPage() {
  return <EmployeeManagementView />;
}
