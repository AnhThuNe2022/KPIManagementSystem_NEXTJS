export function getApiErrorStatus(error: unknown): number {
  if (!(error instanceof Error)) return 500;
  if (error.message === "UNAUTHORIZED") return 401;

  const status = Number(error.message.match(/^API_ERROR_(\d{3}):/)?.[1]);
  return status >= 400 && status <= 599 ? status : 500;
}
