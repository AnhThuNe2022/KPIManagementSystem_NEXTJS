import { notFound } from "next/navigation";
import { SummaryList } from "@/features/summary/components/SummaryList";

export default async function SummaryListPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  if (mode !== "HrSummary" && mode !== "SummaryDirector") notFound();

  return <SummaryList key={mode} mode={mode} />;
}
