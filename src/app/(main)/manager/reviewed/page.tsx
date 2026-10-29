import { ReviewedEvaluations } from "@/features/evaluation/components/ReviewedEvaluations";
import { UserRoleSystem } from "@/types/evaluation";

export default async function ManagerReviewedPage() {
  return <ReviewedEvaluations level={UserRoleSystem.ManagerMid} />;
}
