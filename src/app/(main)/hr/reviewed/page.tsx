import { ReviewedEvaluations } from "@/features/evaluation/components/ReviewedEvaluations";
import { UserRoleSystem } from "@/features/auth/types";

export default async function HRReviewedPage() {
  return <ReviewedEvaluations level={UserRoleSystem.HR} />;
}
