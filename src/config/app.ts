export const appConfig = {
  name: "KPI Management System",
  authCookieName: process.env.AUTH_COOKIE_NAME ?? "dcg_kpi_access_token",
  userNameCookieName: "dcg_kpi_user_name",
} as const;
