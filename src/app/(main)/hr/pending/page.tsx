import { UserRoleSystem } from "@/features/auth/types";
import { PendingEvaluationsView } from "@/features/evaluation/components/PendingEvaluationsView";

export default function HrPendingPage() {
  return <PendingEvaluationsView level={UserRoleSystem.HR} />;
}
