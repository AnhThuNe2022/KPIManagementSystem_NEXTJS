import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { appConfig } from "@/config/app";
import { SummaryList } from "@/features/summary/components/SummaryList";

export default async function SummaryListPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  if (mode !== "HrSummary" && mode !== "SummaryDirector") notFound();
  if (!(await cookies()).has(appConfig.authCookieName)) {
    redirect(`/login?next=/summary/summary-list/${mode}`);
  }
  return <SummaryList key={mode} mode={mode} />;
}
