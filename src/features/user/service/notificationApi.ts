import { request as apiRequest } from "@/lib/api/request";
import { NotificationDto, NotificationPage } from "@/types/notification";

export const NOTIFICATIONS_CHANGED = "notifications:changed";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const result = await apiRequest<T>(endpoint, options);
  if (options.method && options.method !== "GET") window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
  return result;
}


export const notificationApi = {
  async get({ page = 1, pageSize = 20, all = false, signal }: {
    page?: number;
    pageSize?: number;
    all?: boolean;
    signal?: AbortSignal;
  } = {}): Promise<NotificationPage> {
    const data = await request<NotificationPage>(
      `/notifications?page=${all ? 1 : page}&pagesize=${pageSize}`,
      { signal }
    );

    if (!all) return data;

    // shortcut: fetch remaining pages for local search/filters until the backend supports them.
    const items = [...data.items];
    const batchSize = data.items.length;
    for (let nextPage = 2; batchSize && (nextPage - 1) * batchSize < data.total; nextPage++) {
      const next = await notificationApi.get({ page: nextPage, pageSize, signal });
      if (!next.items.length) break;
      items.push(...next.items);
    }
    return { ...data, items: Array.from(new Map(items.map((item) => [item.id, item])).values()) };
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

  async deleteAll() {
    return request<unknown>("/notifications/all", { method: "DELETE" });
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
