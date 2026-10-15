import { proxyNotificationRequest } from "./notificationProxy";

export async function GET(request: Request) {
  return proxyNotificationRequest(
    request,
    "/Notifications",
    "GET"
  );
}