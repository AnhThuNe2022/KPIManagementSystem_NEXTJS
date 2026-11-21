import { notFound, redirect } from "next/navigation";
import { isValidSummaryMode } from "@/features/summary/types";

export default async function SummaryListDetailRedirectPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  if (!isValidSummaryMode(mode)) {
    notFound();
  }
  redirect(`/summary/summary-list/${mode}`);
}
