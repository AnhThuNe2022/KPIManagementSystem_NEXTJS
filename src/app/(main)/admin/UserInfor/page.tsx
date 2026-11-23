import { EmployeeInformationList } from "@/features/user/components/EmployeeInformationList";

export const metadata = {
  title: "Quản lý nhân viên | Đèo Cả",
  description: "Tra cứu, lọc và quản lý hồ sơ nhân viên trong hệ thống KPI.",
};

export default function AdminUserInforPage() {
  return <EmployeeInformationList />;
}
