import { PendingEvaluations } from "@/features/evaluation/components/PendingEvaluations";
import { UserRoleSystem } from "@/types/evaluation";

export default async function HRPendingPage() {
  return <PendingEvaluations level={UserRoleSystem.HR} />;
}
