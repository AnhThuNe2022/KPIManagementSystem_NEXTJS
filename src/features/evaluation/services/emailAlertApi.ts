import { request } from "@/lib/api/request";
import type { PagedResult } from "@/lib/api/types";

interface EmailAlertEnvelope<T> {
  success: boolean;
  data?: T | null;
  error?: string | null;
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

function unwrap<T>(response: EmailAlertEnvelope<T>, fallback: string): T {
  if (!response.success || !response.data) throw new Error(response.error || fallback);
  return response.data;
}

export const emailAlertApi = {
  async getActiveStatuses(templateIds: number[], signal?: AbortSignal): Promise<number[]> {
    const uniqueIds = [...new Set(templateIds)];
    if (!uniqueIds.length) return [];

    const responses = await Promise.all(
      uniqueIds.map((id) => request<{ status: number }[]>(`/evaluation/statuses?templateid=${id}`, { signal }))
    );

    const merged = new Set<number>();
    for (const rows of responses) {
      for (const row of rows) {
        if (!EXCLUDED_STATUSES.has(row.status)) merged.add(row.status);
      }
    }
    return [...merged].sort((a, b) => a - b);
  },

  async getList(body: EmailAlertRequest, signal?: AbortSignal): Promise<PagedResult<EmailAlertItem>> {
    const response = await request<EmailAlertEnvelope<PagedResult<EmailAlertItem>>>("/kpi/email-alert", {
      method: "POST",
      body: JSON.stringify(body),
      signal,
    });
    return unwrap(response, "Không tải được danh sách bản đánh giá.");
  },

  async send(items: EmailAlertItem[]): Promise<SendEmailAlertResult> {
    const response = await request<EmailAlertEnvelope<SendEmailAlertResult>>("/kpievaluation/SendEmailAlert", {
      method: "POST",
      body: JSON.stringify(items),
    });
    return unwrap(response, "Không gửi được email thông báo.");
  },
};
