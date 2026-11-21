import { UserRoleSystem } from "@/features/auth/types";
import { ReviewedEvaluationsView } from "@/features/evaluation/components/ReviewedEvaluationsView";

export default function ManagerReviewedPage() {
  return <ReviewedEvaluationsView level={UserRoleSystem.ManagerMid} />;
}
