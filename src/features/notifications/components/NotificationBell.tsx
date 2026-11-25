"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Popover } from "@astryxdesign/core/Popover";
import { Bell, Check, CheckCheck, MessageSquare, Trash2 } from "lucide-react";
import {
  AppButton,
  AppIconButton,
  AppTextInput,
  InlineErrorBanner,
  StatusFilterTabs,
} from "@/components/ds";
import { NOTIFICATIONS_CHANGED_EVENT, subscribeAppEvent } from "@/lib/events/appEvents";
import { formatDateTime, normalizeVietnamese } from "@/lib/format/formatters";
import { getErrorMessage, isAbortError } from "@/lib/http/request";
import { resolveInternalLink } from "@/lib/security/redirect";
import { isComplaintNotification } from "../notificationUtils";
import { notificationApi } from "../services/notificationApi";
import type { NotificationItem } from "../types";
import { NotificationConversationDialog } from "./NotificationConversationDialog";

export function NotificationBell({ triggerClassName }: { triggerClassName?: string } = {}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [query, setQuery] = useState("");
  const [revision, setRevision] = useState(0);
  const [activeComplaint, setActiveComplaint] = useState<NotificationItem | null>(null);

  const loadRecent = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    notificationApi
      .get({ page: 1, pageSize: 5, signal })
      .then((res) => {
        if (signal?.aborted) return;
        setItems(res.items);
        setUnreadCount(res.unreadCount);
      })
      .catch((cause) => {
        if (!isAbortError(cause)) {
          setError(getErrorMessage(cause, "Không tải được thông báo."));
        }
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false);
      });
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    loadRecent(ctrl.signal);
    return () => ctrl.abort();
  }, [loadRecent, revision]);

  useEffect(() => {
    return subscribeAppEvent(NOTIFICATIONS_CHANGED_EVENT, () => setRevision((v) => v + 1));
  }, []);

  const visibleItems = useMemo(() => {
    const needle = normalizeVietnamese(query);
    return items.filter((item) => {
      if (filter === "unread" && item.isRead) return false;
      if (needle && !normalizeVietnamese(item.message).includes(needle)) return false;
      return true;
    });
  }, [filter, items, query]);

  const handleOpenItem = async (item: NotificationItem) => {
    const target = resolveInternalLink(item.linkNoti);
    if (!item.isRead) {
      try {
        await notificationApi.markRead(item.id);
      } catch {
        // Ignore non-blocking mark-read failure before navigation
      }
    }
    if (target) {
      setIsOpen(false);
      router.push(target);
    }
  };

  const openConversation = (item: NotificationItem) => {
    setIsOpen(false);
    setActiveComplaint(item);
    if (!item.isRead) {
      void notificationApi.markRead(item.id).catch(() => {});
    }
  };

  const unreadDisplay = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <>
    <Popover
      isOpen={isOpen}
      onOpenChange={(next) => {
        setIsOpen(next);
        if (next) setRevision((v) => v + 1);
      }}
      placement="below"
      alignment="end"
      content={
        <div className="flex w-[360px] max-w-[92vw] flex-col gap-3 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-primary">Thông báo</h3>
              <p className="text-xs text-secondary">{unreadCount} chưa đọc</p>
            </div>
            {unreadCount > 0 ? (
              <AppButton
                label="Đọc tất cả"
                variant="ghost"
                size="sm"
                icon={<CheckCheck className="h-3.5 w-3.5" />}
                onClick={() => void notificationApi.markAllRead()}
              />
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <AppTextInput
              label="Tìm thông báo"
              isLabelHidden
              type="search"
              startIcon="search"
              size="sm"
              placeholder="Tìm nhanh trong 5 thông báo gần nhất..."
              value={query}
              onChange={setQuery}
              hasClear
            />
            <StatusFilterTabs
              label="Lọc thông báo"
              value={filter}
              onChange={(v) => setFilter(v === "unread" ? "unread" : "all")}
              items={[
                { value: "all", label: "Tất cả" },
                { value: "unread", label: "Chưa đọc", count: unreadCount },
              ]}
            />
          </div>

          {error ? (
            <InlineErrorBanner message={error} onRetry={() => setRevision((v) => v + 1)} />
          ) : loading && items.length === 0 ? (
            <p className="py-6 text-center text-xs text-secondary">Đang tải thông báo...</p>
          ) : visibleItems.length === 0 ? (
            <p className="py-6 text-center text-xs text-secondary">Không có thông báo phù hợp.</p>
          ) : (
            <ul className="flex max-h-80 flex-col divide-y divide-border overflow-y-auto">
              {visibleItems.map((item) => {
                const target = resolveInternalLink(item.linkNoti);
                const complaint = isComplaintNotification(item);
                const interactive = !item.isRead || Boolean(target) || complaint;
                return (
                  <li
                    key={item.id}
                    className={`flex items-start gap-2.5 px-2 py-2.5 ds-interactive ${
                      item.isRead ? "bg-surface" : "bg-blue-subtle/50"
                    }`}
                  >
                    <button
                      type="button"
                      disabled={!interactive}
                      onClick={() => {
                        if (complaint && !target) {
                          openConversation(item);
                        } else {
                          void handleOpenItem(item);
                        }
                      }}
                      className="flex flex-1 flex-col gap-1 text-left disabled:cursor-default"
                    >
                      <span
                        className={`text-sm leading-relaxed ${
                          item.isRead ? "text-secondary" : "font-semibold text-primary"
                        }`}
                      >
                        {item.message}
                      </span>
                      <span className="text-xs text-disabled">
                        {formatDateTime(item.createdAt)}
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {complaint ? (
                        <AppIconButton
                          label={`Mở trao đổi khiếu nại: ${item.message}`}
                          tooltip="Trao đổi khiếu nại"
                          icon={<MessageSquare className="h-3.5 w-3.5 text-accent" />}
                          onClick={() => openConversation(item)}
                        />
                      ) : !item.isRead ? (
                        <AppIconButton
                          label="Đánh dấu đã đọc"
                          icon={<Check className="h-3.5 w-3.5" />}
                          onClick={() => void notificationApi.markRead(item.id)}
                        />
                      ) : null}
                      <AppIconButton
                        label="Xóa thông báo"
                        icon={<Trash2 className="h-3.5 w-3.5 text-error" />}
                        onClick={() => void notificationApi.deleteOne(item.id)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t border-border pt-2">
            <AppButton
              label="Xem tất cả thông báo"
              variant="secondary"
              size="sm"
              width="100%"
              href="/notifications"
              onClick={() => setIsOpen(false)}
            />
          </div>
        </div>
      }
    >
      {(triggerProps) => (
        <button
          ref={triggerProps.ref}
          type="button"
          onClick={triggerProps.onClick}
          aria-haspopup={triggerProps["aria-haspopup"]}
          aria-expanded={triggerProps["aria-expanded"]}
          aria-controls={triggerProps["aria-controls"]}
          aria-label={`Thông báo (${unreadCount} chưa đọc)`}
          className={
            triggerClassName ||
            "relative flex h-9 w-9 items-center justify-center rounded-md text-secondary ds-interactive hover:bg-overlay-hover hover:text-primary"
          }
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-on-error shadow-sm">
              {unreadDisplay}
            </span>
          ) : null}
        </button>
      )}
    </Popover>

    {activeComplaint ? (
      <NotificationConversationDialog
        key={activeComplaint.id}
        notification={activeComplaint}
        onClose={() => setActiveComplaint(null)}
      />
    ) : null}
    </>
  );
}
