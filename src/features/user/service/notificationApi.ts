import { NotificationDto, NotificationPage } from "@/types/notification";

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

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

export const notificationApi = {
  async getLatest(signal?: AbortSignal) {
    const data = await request<NotificationPage>(
      "/notifications?page=1&pagesize=5",
      { signal }
    );

    if (
      !data || !Array.isArray(data.items) ||
      !Number.isInteger(data.total) || data.total < 0 ||
      !Number.isInteger(data.unreadCount) || data.unreadCount < 0 ||
      !data.items.every((item) => item &&
        Number.isInteger(item.id) && item.id > 0 &&
        typeof item.message === "string" && typeof item.isRead === "boolean")
    ) {
      throw new Error("INVALID_NOTIFICATION_RESPONSE");
    }

    return { ...data, items: data.items.slice(0, 5) };
  },

  async markRead(id: number) {
    return request<unknown>(`/notifications/mark-read/${encodeURIComponent(id)}`, {
      method: "POST",
    });
  },

  async markAllRead() {
    return request<unknown>("/notifications/mark-all-read", { method: "POST" });
  },

  async deleteOne(id: number) {
    return request<unknown>(`/notifications/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

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