import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { appConfig } from "@/config/app";
import { SummaryListDetail } from "@/features/summary/components/SummaryListDetail";

export default async function SummaryListDetailPage({ params }: {
  params: Promise<{ mode: string; periodId: string; companyId: string }>;
}) {
  const route = await params;
  const { mode } = route;
  const periodId = Number(route.periodId);
  const companyId = Number(route.companyId);
  if (mode !== "HrSummary" && mode !== "SummaryDirector") notFound();
  if (!Number.isSafeInteger(periodId) || periodId < 1 || !Number.isSafeInteger(companyId) || (companyId < 1 && companyId !== -1)) notFound();
  if (!(await cookies()).has(appConfig.authCookieName)) {
    redirect("/login?next=/summary/summary-list-detail/" + mode + "/" + periodId + "/" + companyId);
  }
  return <SummaryListDetail key={mode + "-" + periodId + "-" + companyId} mode={mode} periodId={periodId} companyId={companyId} />;
}
