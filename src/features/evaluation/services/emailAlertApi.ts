import { request } from "@/lib/http/request";
import { unwrapApiData, type ApiResponse, type PagedResult } from "@/server/api/types";

interface EmailAlertEnvelope<T> {
  success?: boolean;
  data?: T | null;
  error?: string | null;
  message?: string | null;
}

export interface EmailAlertRecipient {
  id: number;
  evaluationId: number;
  templateLevelId: number;
  userIdStr: string;
  userOrganizationId: number;
  statusStep: number;
  fullName: string | null;
  userName: string | null;
  systemCode: string | null;
  status: string | null;
  isApprove: boolean;
}

export interface EmailAlertItem {
  id: number;
  userId: string;
  systemCode: string | null;
  userFullName: string | null;
  departmentName: string | null;
  jobPositionName: string | null;
  companyCode: string | null;
  templatePeriodId: number | null;
  period: string | null;
  year: number;
  status: string | null;
  emailRecipients: EmailAlertRecipient[];
  action: string | null;
}

export interface EmailAlertRequest {
  EvaluationTypeId: number;
  PeriodId: number;
  Statuses: number[];
  PageNumber: number;
  PageSize: number;
}

export interface SendEmailAlertResult {
  total: number;
  successCount: number;
  failedCount: number;
  failedEvaluationIds: number[];
  errors: string[];
}

// Drafted (1), Rejected (8), SentHR (9) are excluded from the email-alert status dropdown.
const EXCLUDED_STATUSES = new Set([1, 8, 9]);

function unwrapEnvelope<T>(response: EmailAlertEnvelope<T> | T | null | undefined, fallback: string): T {
  if (!response || typeof response !== "object") {
    throw new Error(fallback);
  }
  if ("success" in response) {
    const env = response as EmailAlertEnvelope<T>;
    if (env.success === false || env.data === undefined || env.data === null) {
      throw new Error(env.error || env.message || fallback);
    }
    return env.data;
  }
  return response as T;
}

export const emailAlertApi = {
  async getActiveStatuses(templateIds: number[], signal?: AbortSignal): Promise<number[]> {
    const uniqueIds = [...new Set(templateIds.filter((id) => Number.isInteger(id) && id > 0))];
    if (!uniqueIds.length) return [];

    const responses = await Promise.all(
      uniqueIds.map((id) =>
        request<Array<{ status: number | string }> | ApiResponse<Array<{ status: number | string }>>>(
          `/evaluation/statuses?templateid=${encodeURIComponent(String(id))}`,
          { signal },
        ),
      ),
    );

    const merged = new Set<number>();
    for (const rawRows of responses) {
      const rows = unwrapApiData(rawRows);
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        const rawStatus = row?.status;
        if (rawStatus === undefined || rawStatus === null || rawStatus === "") continue;
        const code = Number(rawStatus);
        if (Number.isInteger(code) && !EXCLUDED_STATUSES.has(code)) {
          merged.add(code);
        }
      }
    }
    return [...merged].sort((a, b) => a - b);
  },

  async getList(body: EmailAlertRequest, signal?: AbortSignal): Promise<PagedResult<EmailAlertItem>> {
    const response = await request<EmailAlertEnvelope<PagedResult<EmailAlertItem>> | PagedResult<EmailAlertItem>>(
      "/kpi/email-alert",
      {
        method: "POST",
        body: JSON.stringify(body),
        signal,
      },
    );
    const data = unwrapEnvelope(response, "Không tải được danh sách bản đánh giá.");
    const items = Array.isArray(data.items)
      ? data.items.map((item) => ({
          ...item,
          emailRecipients: Array.isArray(item.emailRecipients) ? item.emailRecipients : [],
        }))
      : [];
    return {
      items,
      total: Number(data.total ?? items.length),
      page: data.page,
      pageSize: data.pageSize,
    };
  },

  async send(items: EmailAlertItem[]): Promise<SendEmailAlertResult> {
    const response = await request<EmailAlertEnvelope<SendEmailAlertResult> | SendEmailAlertResult>(
      "/kpievaluation/SendEmailAlert",
      {
        method: "POST",
        body: JSON.stringify(items),
      },
    );
    const data = unwrapEnvelope(response, "Không gửi được email thông báo.");
    return {
      total: Number(data.total ?? items.length),
      successCount: Number(data.successCount ?? 0),
      failedCount: Number(data.failedCount ?? 0),
      failedEvaluationIds: Array.isArray(data.failedEvaluationIds) ? data.failedEvaluationIds : [],
      errors: Array.isArray(data.errors) ? data.errors : [],
    };
  },
};
