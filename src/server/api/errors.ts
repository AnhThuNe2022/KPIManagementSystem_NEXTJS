export class ApiError extends Error {
  readonly status: number;
  readonly body: string;
  readonly contentType: string;

  constructor(status: number, body: string, contentType = "application/json; charset=utf-8") {
    super(`Upstream API error (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.contentType = contentType;
  }
}

export function getApiErrorStatus(error: unknown): number {
  if (error instanceof ApiError) return error.status;
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return 401;
    if (error.message === "FORBIDDEN") return 403;
    if (error.message === "API_URL_NOT_CONFIGURED") return 502;
  }
  return 500;
}
