import { BackgroundJobMonitor } from "@/features/background-jobs/components/BackgroundJobMonitor";

export const metadata = {
  title: "Background Job Monitor | Đèo Cả KPI",
  description: "Theo dõi trạng thái và lịch sử thực thi Background Jobs",
};

export default function AdminBackgroundJobsPage() {
  return <BackgroundJobMonitor />;
}
