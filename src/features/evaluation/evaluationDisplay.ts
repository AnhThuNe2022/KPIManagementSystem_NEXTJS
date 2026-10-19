const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatEvaluationDate(value: string | null, fallback = "—") {
  const date = value ? new Date(value) : null;
  if (!date || !Number.isFinite(date.getTime()) || date.getFullYear() < 1900) return fallback;
  return dateFormatter.format(date);
}

export function requestMessage(cause: unknown, fallback: string) {
  if (cause instanceof Error && cause.message === "UNAUTHORIZED") {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }
  if (cause instanceof Error && cause.message === "FORBIDDEN") {
    return "Bạn chưa có quyền xem danh sách này.";
  }
  return fallback;
}
