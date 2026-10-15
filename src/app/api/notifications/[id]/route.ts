import { proxyNotificationRequest } from "../notificationProxy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;

  return proxyNotificationRequest(
    request,
    "/Notifications/" + encodeURIComponent(id),
    "DELETE"
  );
}