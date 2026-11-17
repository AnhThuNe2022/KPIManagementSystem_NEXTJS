import { PendingEvaluations } from "@/features/evaluation/components/PendingEvaluations";
import { UserRoleSystem } from "@/features/auth/types";

export default async function ManagerPendingPage() {
  return <PendingEvaluations level={UserRoleSystem.ManagerMid} />;
}
