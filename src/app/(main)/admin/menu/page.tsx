import { MenuManagement } from "@/features/menus/components/MenuManagement";

export const metadata = {
  title: "Quản lý menu | Đèo Cả",
  description: "Quản lý cấu trúc và thông tin menu của hệ thống KPI.",
};

export default async function MenuPage() {
  return <MenuManagement />;
}
