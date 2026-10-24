import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { appConfig } from "@/config/app";
import { PendingEvaluations } from "@/features/evaluation/components/PendingEvaluations";
import { UserRoleSystem } from "@/types/evaluation";

export default async function HRPendingPage() {
  if (!(await cookies()).has(appConfig.authCookieName)) redirect("/login?next=/hr/pending");
  return <PendingEvaluations level={UserRoleSystem.HR} />;
}
