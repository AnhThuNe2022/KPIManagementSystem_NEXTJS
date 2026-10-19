import type {
  PagedResult,
  ReviewedEvaluationDto,
  ReviewedEvaluationFilters,
  ReviewRole,
} from "@/types/evaluation";
import { request } from "./evaluationRequest";

function isReviewedEvaluation(item: ReviewedEvaluationDto) {
  if (!item) return false;

  const textFields = [
    item.employeeCode,
    item.employeeName,
    item.departmentName,
    item.periodLabel,
    item.approvedDate,
    item.approverName,
    item.rejectedReason,
    item.band,
  ];
  const validText = textFields.every((value) => value == null || typeof value === "string");
  const validScores = [item.totalScore, item.managerSocre].every(
    (value) => value == null || (typeof value === "number" && Number.isFinite(value)),
  );

  return (
    Number.isSafeInteger(item.id) &&
    item.id > 0 &&
    Number.isSafeInteger(item.evalid) &&
    item.evalid > 0 &&
    typeof item.status === "string" &&
    validText &&
    validScores
  );
}

export const reviewedEvaluationApi = {
  async get({
    level,
    page,
    pageSize,
    filters,
    signal,
  }: {
    level: ReviewRole;
    page: number;
    pageSize: number;
    filters: ReviewedEvaluationFilters;
    signal?: AbortSignal;
  }): Promise<PagedResult<ReviewedEvaluationDto>> {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      rolePage: String(level),
    });
    for (const [key, value] of Object.entries(filters)) {
      if (value.trim()) params.set(key, value.trim());
    }

    const data = (await request(`/evaluation/reviewed?${params}`, {
      signal,
    })) as PagedResult<ReviewedEvaluationDto>;
    if (
      !data ||
      !Number.isSafeInteger(data.total) ||
      data.total < 0 ||
      !Array.isArray(data.items) ||
      !data.items.every(isReviewedEvaluation)
    ) {
      throw new Error("INVALID_REVIEWED_RESPONSE");
    }
    return { items: data.items, total: data.total };
  },
};
