import { PendingEvaluations } from "@/features/evaluation/components/PendingEvaluations";
import { UserRoleSystem } from "@/types/evaluation";

export default async function ManagerPendingPage() {
  return <PendingEvaluations level={UserRoleSystem.ManagerMid} />;
}
