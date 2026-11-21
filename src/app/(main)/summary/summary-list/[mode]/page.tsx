import { notFound } from "next/navigation";
import { SummaryListView } from "@/features/summary/components/SummaryListView";
import { isValidSummaryMode } from "@/features/summary/types";

export default async function SummaryListPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  if (!isValidSummaryMode(mode)) {
    notFound();
  }
  return <SummaryListView mode={mode} />;
}
