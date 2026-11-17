import { notFound, redirect } from "next/navigation";

export default async function SummaryListDetailPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  if (mode !== "HrSummary" && mode !== "SummaryDirector") notFound();
  redirect(`/summary/summary-list/${mode}`);
}
