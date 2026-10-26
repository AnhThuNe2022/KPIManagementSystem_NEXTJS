import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { appConfig } from "@/config/app";
import { GeneralHrEvaluations } from "@/features/evaluation/components/GeneralHrEvaluations";

export const metadata = { title: "Theo dõi đánh giá | Đèo Cả" };

export default async function GeneralHrPage() {
  if (!(await cookies()).has(appConfig.authCookieName)) redirect("/login?next=/admin/evaluationList");
  return <GeneralHrEvaluations />;
}
