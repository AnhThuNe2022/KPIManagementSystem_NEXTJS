import { NotificationDto } from "@/types/notification";

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("UNAUTHORIZED");
    }

    throw new Error(`API_ERROR_${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const notificationApi = {
  async sendMessage(model: NotificationDto) {
    return request<NotificationDto>(
      "/notifications/sendMessage",
      {
        method: "POST",
        body: JSON.stringify(model),
      }
    );
  },
};