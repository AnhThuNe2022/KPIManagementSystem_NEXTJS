import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { appConfig } from "@/config/app";
import { ReviewedEvaluations } from "@/features/evaluation/components/ReviewedEvaluations";
import { UserRoleSystem } from "@/types/evaluation";

export default async function ManagerReviewedPage() {
  if (!(await cookies()).has(appConfig.authCookieName)) redirect("/login?next=/manager/reviewed");
  return <ReviewedEvaluations level={UserRoleSystem.ManagerMid} />;
}
