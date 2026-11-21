export const appConfig = {
  appName: "DCG KPI Management",
  brandName: "Đèo Cả Group",
  authCookieName: process.env.AUTH_COOKIE_NAME ?? "dcg_kpi_access_token",
  userIdCookieName: "auth_user_id",
  rolesCookieName: "auth_roles",
  userNameCookieName: "dcg_kpi_user_name",
  cookieMaxAgeSeconds: 60 * 60 * 12, // 12 hours
} as const;
