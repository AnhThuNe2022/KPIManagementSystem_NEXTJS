import { EvaluationPeriodList } from "@/features/evaluation/components/EvaluationPeriodList";

export const metadata = {
  title: "Danh sách kỳ đánh giá KPI | Đèo Cả",
  description: "Theo dõi chu kỳ và thời gian hiệu lực các kỳ đánh giá KPI.",
};

export default function EvaluationPeriodsPage() {
  return <EvaluationPeriodList />;
}
