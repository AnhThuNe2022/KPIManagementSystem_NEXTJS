export class ApiError extends Error {
  constructor(readonly status: number, readonly body: string, readonly contentType: string | null) {
    super(`API_ERROR_${status}: ${body}`);
  }
}

export function getApiErrorStatus(error: unknown): number {
  if (error instanceof ApiError) return error.status;
  if (!(error instanceof Error)) return 500;
  if (error.message === "UNAUTHORIZED") return 401;
  return 500;
}
