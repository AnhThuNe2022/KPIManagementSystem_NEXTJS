import { notFound } from "next/navigation";
import { SummaryListDetailView } from "@/features/summary/components/SummaryListDetailView";
import { isValidSummaryMode } from "@/features/summary/types";

export default async function SummaryListDetailPage({
  params,
}: {
  params: Promise<{ mode: string; periodId: string; companyId: string }>;
}) {
  const { mode, periodId: rawPeriodId, companyId: rawCompanyId } = await params;
  const periodId = Number(rawPeriodId);
  const companyId = Number(rawCompanyId);

  if (
    !isValidSummaryMode(mode) ||
    !Number.isInteger(periodId) ||
    periodId < 1 ||
    !Number.isInteger(companyId) ||
    (companyId < 1 && companyId !== -1)
  ) {
    notFound();
  }

  return (
    <SummaryListDetailView mode={mode} periodId={periodId} companyId={companyId} />
  );
}
