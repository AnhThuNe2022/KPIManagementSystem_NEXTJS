import { UserRoleSystem } from "@/features/auth/types";
import { PendingEvaluationsView } from "@/features/evaluation/components/PendingEvaluationsView";

export default function ManagerPendingPage() {
  return <PendingEvaluationsView level={UserRoleSystem.ManagerMid} />;
}
