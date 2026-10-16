import type { Metadata } from "next";
import { Notifications } from "@/features/notifications/components/Notifications";

export const metadata: Metadata = { title: "Thông báo | KPI Management" };

export default function NotificationsPage() {
  return <Notifications />;
}
