export const appConfig = {
  name: "KPI Management System",
  authCookieName: process.env.AUTH_COOKIE_NAME ?? "dcg_kpi_access_token",
} as const;
