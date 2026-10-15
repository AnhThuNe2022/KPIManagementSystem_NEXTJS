import { proxyNotificationRequest } from "../notificationProxy";

export async function POST(request: Request) {
  return proxyNotificationRequest(
    request,
    "/Notifications/mark-all-read",
    "POST"
  );
}