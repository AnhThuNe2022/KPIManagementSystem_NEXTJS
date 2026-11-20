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

const TECHNICAL_ERROR_PATTERN =
  /SqlTransaction|no longer usable|InternalServerError|Object reference not set|API_ERROR_\d+/i;

export function isTechnicalError(message: string) {
  return TECHNICAL_ERROR_PATTERN.test(message);
}

export function requestMessage(cause: unknown, fallback: string) {
  if (cause instanceof Error && cause.message === "UNAUTHORIZED") {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }

  if (cause instanceof Error && cause.message === "FORBIDDEN") {
    return "Bạn chưa có quyền thực hiện thao tác này.";
  }

  if (cause instanceof Error && isTechnicalError(cause.message)) {
    return isTechnicalError(fallback)
      ? "Không thể xử lý yêu cầu lúc này. Vui lòng thử lại."
      : fallback;
  }

  return fallback;
}


export function handleRequestError(
  cause: unknown,
  fallback: string,
  signal?: AbortSignal,
): string | null {
  if (signal?.aborted) return null;

  if (cause instanceof Error && cause.name === "AbortError") {
    return null;
  }

  return requestMessage(cause, fallback);
}