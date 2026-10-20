import type {
  PagedResult,
  PendingEvaluationDto,
  PendingEvaluationFilters,
  ReviewRole,
} from "@/types/evaluation";
import { request } from "./evaluationRequest";
import { UserRoleSystem } from "@/types/evaluation";

function isPendingEvaluation(item: PendingEvaluationDto) {
  if (!item) return false;

  const textFields = [
    item.userCode,
    item.userName,
    item.departmentName,
    item.periodLabel,
    item.submittedDate,
    item.sysTemCode,
    item.reason,
    item.companyCode,
  ];
  const validText = textFields.every((value) => value == null || typeof value === "string");
  const validScore =
    item.selfScore == null ||
    (typeof item.selfScore === "number" && Number.isFinite(item.selfScore));

  return (
    Number.isSafeInteger(item.id) &&
    item.id > 0 &&
    Number.isSafeInteger(item.stepId) &&
    item.stepId > 0 &&
    typeof item.status === "string" &&
    typeof item.isRejected === "boolean" &&
    validText &&
    validScore
  );
}

export const pendingEvaluationApi = {
  async reject(item: Pick<PendingEvaluationDto, "id" | "stepId">, reason: string): Promise<void> {
    await request(`/evaluation/review-action/${item.id}`, {
      method: "POST",
      body: JSON.stringify({
        Action: 2, // ActionHistoty.Rejected
        Level: UserRoleSystem.ManagerMid,
        Comment: reason.trim(),
        StepId: item.stepId,
      }),
    });
  },

  async get({
    page = 1,
    pageSize = 20,
    level,
    filters,
    sortBy,
    signal,
  }: {
    page?: number;
    pageSize?: number;
    level: ReviewRole;
    filters: PendingEvaluationFilters;
    sortBy: string;
    signal?: AbortSignal;
  }): Promise<PagedResult<PendingEvaluationDto>> {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      level: String(level),
      sortBy,
    });
    for (const [key, value] of Object.entries(filters)) {
      if (value.trim()) params.set(key, value.trim());
    }

    const data = (await request(`/evaluation/pending?${params}`, {
      signal,
    })) as PagedResult<PendingEvaluationDto>;
    if (
      !data ||
      !Number.isSafeInteger(data.total) ||
      data.total < 0 ||
      !Array.isArray(data.items) ||
      !data.items.every(isPendingEvaluation)
    ) {
      throw new Error("INVALID_PENDING_RESPONSE");
    }
    return { items: data.items, total: data.total };
  },
};
