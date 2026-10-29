import { ReviewedEvaluations } from "@/features/evaluation/components/ReviewedEvaluations";
import { UserRoleSystem } from "@/types/evaluation";

export default async function HRReviewedPage() {
  return <ReviewedEvaluations level={UserRoleSystem.HR} />;
}
