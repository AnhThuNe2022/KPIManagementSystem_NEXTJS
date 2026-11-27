export interface BackgroundJobStatistics {
  total: number;
  pending: number;
  processing: number;
  success: number;
  failed: number;
  cancelled: number;
  retryWaiting: number;
}

export interface BackgroundJobItem {
  id: number;
  jobType: string;
  jobName: string;
  status: number;
  retryCount: number;
  maxRetryCount: number;
  scheduledAt: string | null;
  nextRetryAt: string | null;
  lastError: string | null;
  createdAt: string | null;
  lockedUntil: string | null;
}

export interface BackgroundJobDetail extends BackgroundJobItem {
  payload: string | null;
}

export interface BackgroundJobAttempt {
  id: number;
  jobId: number;
  attemptNumber: number;
  status: number;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
}

export interface BackgroundJobListResponse {
  total: number;
  page: number;
  pageSize: number;
  items: BackgroundJobItem[];
}

export interface BackgroundJobFilter {
  page: number;
  pageSize: number;
  status?: string;
  jobType?: string;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
}

export const BackgroundJobStatus = {
  Pending: 0,
  Processing: 1,
  Success: 2,
  Failed: 3,
  Cancelled: 4,
  RetryWaiting: 5,
} as const;

export type JobTone = "pending" | "processing" | "success" | "failed" | "cancelled" | "retry";

export const JOB_STATUS_OPTIONS: ReadonlyArray<{ id: string; name: string; tone: JobTone }> = [
  { id: String(BackgroundJobStatus.Pending), name: "Chờ xử lý", tone: "pending" },
  { id: String(BackgroundJobStatus.Processing), name: "Đang xử lý", tone: "processing" },
  { id: String(BackgroundJobStatus.Success), name: "Thành công", tone: "success" },
  { id: String(BackgroundJobStatus.Failed), name: "Thất bại", tone: "failed" },
  { id: String(BackgroundJobStatus.Cancelled), name: "Đã hủy", tone: "cancelled" },
  { id: String(BackgroundJobStatus.RetryWaiting), name: "Chờ thử lại", tone: "retry" },
];

export const JOB_TYPE_OPTIONS: ReadonlyArray<{ id: string; name: string }> = [
  { id: "SendEmail", name: "Gửi email" },
  { id: "SendNotification", name: "Gửi thông báo" },
  { id: "SyncData", name: "Đồng bộ dữ liệu" },
  { id: "GenerateReport", name: "Tạo báo cáo" },
];

export function jobStatusInfo(status: number): { label: string; tone: JobTone } {
  const found = JOB_STATUS_OPTIONS.find((item) => Number(item.id) === status);
  if (found) return { label: found.name, tone: found.tone };
  return { label: `Trạng thái #${status}`, tone: "cancelled" };
}

export function attemptStatusInfo(status: number, errorMessage?: string | null): { label: string; tone: JobTone } {
  if (status === 1) return { label: "Thành công", tone: "success" };
  if (status === 2 || errorMessage) return { label: "Thất bại", tone: "failed" };
  if (status === 0) return { label: "Đang chạy", tone: "processing" };
  return { label: `Trạng thái #${status}`, tone: "cancelled" };
}

export function jobTypeLabel(jobType: string): string {
  return JOB_TYPE_OPTIONS.find((item) => item.id === jobType)?.name ?? jobType;
}

// Backend SQL timestamps are stored in UTC without a trailing "Z" suffix.
export function parseUtcDate(value?: string | null): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = /[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed) ? trimmed : `${trimmed}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function formatJobDateTime(value?: string | null): string {
  const date = parseUtcDate(value);
  if (!date) return "—";
  const parts = dateTimeFormatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

export function formatAttemptDuration(startedAt?: string | null, finishedAt?: string | null): string {
  const start = parseUtcDate(startedAt);
  const end = parseUtcDate(finishedAt);
  if (!start || !end) return "—";
  const ms = Math.max(0, end.getTime() - start.getTime());
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1).replace(".", ",")} giây`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round((ms % 60_000) / 1000);
  return `${mins}p ${secs}s`;
}

export interface EmailJobPayload {
  toEmail: string;
  subject: string;
  body: string;
}

export function prepareEmailPreviewHtml(rawHtml: string): string {
  // Strip script tags and inline MIME cid: images (which browsers cannot resolve outside SMTP clients).
  const cleaned = rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<img\b[^>]*\bsrc\s*=\s*["']cid:[^"']*["'][^>]*\/?>/gi, "");

  const responsiveHead = [
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    "<style>",
    "*{box-sizing:border-box !important;}",
    "html,body{margin:0 !important;height:auto !important;max-width:100% !important;overflow:hidden !important;}",
    "img[src^='cid:']{display:none !important;}",
    "img{max-width:100% !important;height:auto !important;}",
    "table{max-width:100% !important;}",
    "table[width]{width:100% !important;max-width:640px !important;}",
    "@media (max-width: 640px){",
    "body{padding:12px !important;}",
    "td{word-break:break-word !important;overflow-wrap:anywhere !important;}",
    "td[style*='padding:36px'],td[style*='padding: 36px']{padding:20px 16px !important;}",
    "td[style*='padding:20px 28px'],td[style*='padding: 20px 28px']{padding:16px 18px !important;}",
    "a[style*='padding:14px 32px']{padding:12px 22px !important;}",
    "}",
    "</style>",
  ].join("");

  return /<\/head>/i.test(cleaned)
    ? cleaned.replace(/<\/head>/i, `${responsiveHead}</head>`)
    : `${responsiveHead}${cleaned}`;
}

export function parseJobPayload(raw?: string | null): {
  prettyJson: string;
  email: EmailJobPayload | null;
} {
  if (!raw?.trim()) return { prettyJson: "", email: null };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const prettyJson = JSON.stringify(parsed, null, 2);
    const toEmail = typeof parsed.ToEmail === "string" ? parsed.ToEmail : typeof parsed.toEmail === "string" ? parsed.toEmail : "";
    const subject = typeof parsed.Subject === "string" ? parsed.Subject : typeof parsed.subject === "string" ? parsed.subject : "";
    const body = typeof parsed.Body === "string" ? parsed.Body : typeof parsed.body === "string" ? parsed.body : "";
    if (toEmail || subject || body) {
      return { prettyJson, email: { toEmail, subject, body } };
    }
    return { prettyJson, email: null };
  } catch {
    return { prettyJson: raw, email: null };
  }
}
