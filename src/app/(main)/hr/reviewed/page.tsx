import { UserRoleSystem } from "@/features/auth/types";
import { ReviewedEvaluationsView } from "@/features/evaluation/components/ReviewedEvaluationsView";

export default function HrReviewedPage() {
  return <ReviewedEvaluationsView level={UserRoleSystem.HR} />;
}
