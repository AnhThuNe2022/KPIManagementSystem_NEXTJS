import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { appConfig } from "@/config/app";
import { SummaryListDetail } from "@/features/summary/components/SummaryListDetail";

export default async function SummaryListDetailPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  if (mode !== "HrSummary" && mode !== "SummaryDirector") notFound();
  if (!(await cookies()).has(appConfig.authCookieName)) {
    redirect(`/login?next=/summary/summary-list-detail/${mode}`);
  }
  return <SummaryListDetail key={mode} mode={mode} />;
}
