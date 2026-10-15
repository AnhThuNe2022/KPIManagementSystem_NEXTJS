import { proxyNotificationRequest } from "../../notificationProxy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  return proxyNotificationRequest(
    request,
    "/Notifications/mark-read/" + encodeURIComponent(id),
    "POST"
  );
}