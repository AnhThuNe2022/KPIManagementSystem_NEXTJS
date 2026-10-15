import { proxyNotificationRequest } from "../notificationProxy";

export async function DELETE(request: Request) {
  return proxyNotificationRequest(
    request,
    "/Notifications/all",
    "DELETE"
  );
}