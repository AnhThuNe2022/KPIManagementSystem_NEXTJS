import { emitAppEvent, NOTIFICATIONS_CHANGED_EVENT } from "@/lib/events/appEvents";
import { request } from "@/lib/http/request";
import type { NotificationDto, NotificationItem, NotificationPage } from "../types";

export const notificationApi = {
  async get(params: {
    page?: number;
    pageSize?: number;
    all?: boolean;
    signal?: AbortSignal;
  } = {}): Promise<NotificationPage> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;

    const first = await request<NotificationPage>(
      `/notifications?page=${page}&pagesize=${pageSize}`,
      { signal: params.signal },
    );

    const normalizedFirst: NotificationPage = {
      unreadCount: Number(first?.unreadCount ?? 0),
      total: Number(first?.total ?? 0),
      items: Array.isArray(first?.items) ? first.items : [],
      page: Number(first?.page ?? page),
      pageSize: Number(first?.pageSize ?? pageSize),
    };

    if (!params.all || normalizedFirst.items.length >= normalizedFirst.total) {
      return normalizedFirst;
    }

    const collected: NotificationItem[] = [...normalizedFirst.items];
    const totalPages = Math.ceil(normalizedFirst.total / pageSize);
    for (let nextPage = 2; nextPage <= totalPages; nextPage += 1) {
      if (params.signal?.aborted) break;
      const chunk = await request<NotificationPage>(
        `/notifications?page=${nextPage}&pagesize=${pageSize}`,
        { signal: params.signal },
      );
      if (Array.isArray(chunk?.items) && chunk.items.length > 0) {
        collected.push(...chunk.items);
      } else {
        break;
      }
    }

    return {
      ...normalizedFirst,
      items: collected,
    };
  },

  async markRead(id: number): Promise<void> {
    await request(`/notifications/mark-read/${id}`, { method: "POST" });
    emitAppEvent(NOTIFICATIONS_CHANGED_EVENT);
  },

  async markAllRead(): Promise<void> {
    await request("/notifications/mark-all-read", { method: "POST" });
    emitAppEvent(NOTIFICATIONS_CHANGED_EVENT);
  },

  async deleteOne(id: number): Promise<void> {
    await request(`/notifications/${id}`, { method: "DELETE" });
    emitAppEvent(NOTIFICATIONS_CHANGED_EVENT);
  },

  async deleteAll(): Promise<void> {
    await request("/notifications/all", { method: "DELETE" });
    emitAppEvent(NOTIFICATIONS_CHANGED_EVENT);
  },

  async sendMessage(
    payload: NotificationDto,
    options?: { silentEvent?: boolean },
  ): Promise<NotificationDto> {
    const res = await request<NotificationDto>("/notifications/sendMessage", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!options?.silentEvent) {
      emitAppEvent(NOTIFICATIONS_CHANGED_EVENT);
    }
    return res;
  },
};
