"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@astryxdesign/core/Card";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  ExternalLink,
  MailOpen,
  MessageSquare,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  AppButton,
  AppEmptyState,
  AppIconButton,
  AppPagination,
  AppTextInput,
  ConfirmDialog,
  InlineErrorBanner,
  LoadingOverlay,
  PageFrame,
  PageHeader,
  ReadStatusBadge,
  StatusFilterTabs,
  TagBadge,
  useAppToast,
} from "@/components/ds";
import { NOTIFICATIONS_CHANGED_EVENT, subscribeAppEvent } from "@/lib/events/appEvents";
import { formatDate, formatDateTime, normalizeVietnamese } from "@/lib/format/formatters";
import { ApiRequestError, getErrorMessage, isAbortError } from "@/lib/http/request";
import { resolveInternalLink } from "@/lib/security/redirect";
import { isComplaintNotification } from "../notificationUtils";
import { notificationApi } from "../services/notificationApi";
import type { NotificationItem } from "../types";
import { NotificationConversationDialog } from "./NotificationConversationDialog";

type ReadFilter = "all" | "unread" | "read";

function formatDayGroupLabel(iso: string | null): string {
  if (!iso) return "Khác";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Khác";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Hôm nay";
  if (sameDay(date, yesterday)) return "Hôm qua";
  return formatDate(date);
}

export function NotificationsPageView() {
  const showToast = useAppToast();

  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reloadTick, setReloadTick] = useState(0);

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const [busyIds, setBusyIds] = useState<Set<number>>(() => new Set());
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [activeComplaint, setActiveComplaint] = useState<NotificationItem | null>(null);

  const fetchCtrlRef = useRef<AbortController | null>(null);
  const needsAllFetch = readFilter !== "all" || Boolean(keyword.trim());

  const loadNotifications = useCallback(async () => {
    fetchCtrlRef.current?.abort();
    const ctrl = new AbortController();
    fetchCtrlRef.current = ctrl;
    setIsLoading(true);
    setError(null);
    setIsUnauthorized(false);

    try {
      const res = await notificationApi.get({
        page: needsAllFetch ? 1 : page,
        pageSize: needsAllFetch ? 50 : pageSize,
        all: needsAllFetch,
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      setItems(res.items);
      setTotal(res.total);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      if (isAbortError(err) || ctrl.signal.aborted) return;
      setError(getErrorMessage(err, "Không thể tải danh sách thông báo."));
      setIsUnauthorized(err instanceof ApiRequestError && err.status === 401);
    } finally {
      if (!ctrl.signal.aborted) setIsLoading(false);
    }
  }, [needsAllFetch, page, pageSize]);

  useEffect(() => {
    void loadNotifications();
    return () => fetchCtrlRef.current?.abort();
  }, [loadNotifications, reloadTick]);

  // Sync with Header NotificationBell updates
  useEffect(() => {
    return subscribeAppEvent(NOTIFICATIONS_CHANGED_EVENT, () => {
      setReloadTick((t) => t + 1);
    });
  }, []);

  const filteredItems = useMemo(() => {
    if (!needsAllFetch) return items;
    const needle = normalizeVietnamese(keyword);
    return items.filter((item) => {
      if (readFilter === "unread" && item.isRead) return false;
      if (readFilter === "read" && !item.isRead) return false;
      if (needle && !normalizeVietnamese(item.message).includes(needle)) return false;
      return true;
    });
  }, [items, keyword, needsAllFetch, readFilter]);

  const effectiveTotal = needsAllFetch ? filteredItems.length : total;
  const visibleItems = useMemo(() => {
    if (!needsAllFetch) return items;
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, items, needsAllFetch, page, pageSize]);

  const groupedByDay = useMemo(() => {
    const groups = new Map<string, NotificationItem[]>();
    for (const item of visibleItems) {
      const label = formatDayGroupLabel(item.createdAt);
      const bucket = groups.get(label) ?? [];
      bucket.push(item);
      groups.set(label, bucket);
    }
    return Array.from(groups.entries());
  }, [visibleItems]);

  const readCount = Math.max(0, total - unreadCount);
  const readPercent = total > 0 ? Math.round((readCount / total) * 100) : 100;

  const handleMarkRead = async (id: number) => {
    setBusyIds((prev) => new Set([...prev, id]));
    try {
      await notificationApi.markRead(id);
      showToast("success", "Đã đánh dấu thông báo đã đọc.");
    } catch (err) {
      showToast("error", getErrorMessage(err, "Không thể đánh dấu đã đọc."));
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDeleteOne = async (id: number) => {
    setBusyIds((prev) => new Set([...prev, id]));
    try {
      await notificationApi.deleteOne(id);
      showToast("success", "Đã xóa thông báo.");
    } catch (err) {
      showToast("error", getErrorMessage(err, "Không thể xóa thông báo."));
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await notificationApi.markAllRead();
      showToast("success", "Đã đánh dấu tất cả thông báo là đã đọc.");
    } catch (err) {
      showToast("error", getErrorMessage(err, "Không thể đánh dấu tất cả đã đọc."));
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      await notificationApi.deleteAll();
      setDeleteAllOpen(false);
      showToast("success", "Đã xóa toàn bộ thông báo.");
    } catch (err) {
      showToast("error", getErrorMessage(err, "Không thể xóa toàn bộ thông báo."));
    } finally {
      setIsDeletingAll(false);
    }
  };

  const openConversation = (item: NotificationItem) => {
    setActiveComplaint(item);
    if (!item.isRead) {
      void notificationApi.markRead(item.id).catch(() => {});
    }
  };

  return (
    <PageFrame maxWidth="wide">
      <PageHeader
        artwork="personal"
        icon={<Bell className="h-5 w-5" />}
        eyebrow="Trung tâm thông báo"
        title="Thông báo của bạn"
        description="Theo dõi các cập nhật phê duyệt KPI, phản hồi từ nhân sự và thông báo hệ thống."
        actions={
          <>
            <AppButton
              label="Làm mới"
              variant="secondary"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => setReloadTick((t) => t + 1)}
            />
            <AppButton
              label="Đọc tất cả"
              variant="secondary"
              icon={<CheckCheck className="h-4 w-4" />}
              isLoading={isMarkingAll}
              isDisabled={unreadCount === 0 || isMarkingAll}
              onClick={handleMarkAllRead}
            />
            <AppButton
              label="Xóa tất cả"
              variant="destructive"
              icon={<Trash2 className="h-4 w-4" />}
              isDisabled={total === 0}
              onClick={() => setDeleteAllOpen(true)}
            />
          </>
        }
      />

      {/* Overview card */}
      <Card padding={4} elevation="low">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-subtle text-red-vivid">
                <Bell className="h-5 w-5" />
              </span>
              <div>
                <div className="text-xs text-secondary">Chưa đọc</div>
                <div className="text-2xl font-bold text-primary">{unreadCount}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-subtle text-green-vivid">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <div className="text-xs text-secondary">Đã đọc</div>
                <div className="text-2xl font-bold text-primary">{readCount}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-secondary">Tổng cộng</div>
              <div className="text-2xl font-bold text-primary">{total}</div>
            </div>
          </div>

          <div className="w-full md:w-72">
            <ProgressBar
              label={`Tiến độ đọc (${readPercent}%)`}
              value={readPercent}
              max={100}
              variant={readPercent === 100 ? "success" : "accent"}
            />
          </div>
        </div>
      </Card>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusFilterTabs
          label="Lọc trạng thái đọc"
          value={readFilter}
          onChange={(next) => {
            setReadFilter(next as ReadFilter);
            setPage(1);
          }}
          items={[
            { value: "all", label: "Tất cả", count: total },
            { value: "unread", label: "Chưa đọc", count: unreadCount },
            { value: "read", label: "Đã đọc", count: readCount },
          ]}
        />
        <div className="w-full sm:w-80">
          <AppTextInput
            label="Tìm nội dung thông báo"
            isLabelHidden
            value={keyword}
            onChange={(val) => {
              setKeyword(val);
              setPage(1);
            }}
            placeholder="Tìm nội dung thông báo..."
            startIcon="search"
            hasClear
          />
        </div>
      </div>

      {/* Day-grouped stream */}
      {error ? (
        <InlineErrorBanner
          message={error}
          isUnauthorized={isUnauthorized}
          loginNextPath="/notifications"
          onRetry={() => setReloadTick((t) => t + 1)}
        />
      ) : isLoading ? (
        <LoadingOverlay label="Đang tải thông báo..." />
      ) : visibleItems.length === 0 ? (
        <Card padding={6} elevation="low">
          <AppEmptyState
            title="Không có thông báo nào"
            description={
              needsAllFetch
                ? "Không có thông báo nào khớp với bộ lọc hiện tại."
                : "Bạn đã xem hết tất cả thông báo."
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-5 ds-fade-in">
          {groupedByDay.map(([dayLabel, groupItems]) => (
            <section key={dayLabel} className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary">
                {dayLabel} ({groupItems.length})
              </h3>
              <Card padding={0} elevation="low">
                <ul className="divide-y divide-border">
                  {groupItems.map((item) => {
                    const internalHref = resolveInternalLink(item.linkNoti);
                    const complaint = isComplaintNotification(item);
                    const isBusy = busyIds.has(item.id);
                    return (
                      <li
                        key={item.id}
                        className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between ds-interactive ${
                          item.isRead ? "bg-surface" : "bg-blue-subtle/35"
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <ReadStatusBadge isRead={item.isRead} />
                            {complaint ? <TagBadge label="Khiếu nại" tone="orange" /> : null}
                            <span className="text-xs text-secondary">
                              {formatDateTime(item.createdAt)}
                            </span>
                          </div>
                          <p
                            className={`text-sm leading-relaxed ${
                              item.isRead ? "text-secondary" : "font-medium text-primary"
                            }`}
                          >
                            {item.message}
                          </p>
                        </div>

                        {/* Always visible on BOTH desktop and mobile */}
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          {complaint ? (
                            <AppButton
                              label="Trao đổi"
                              variant="secondary"
                              size="sm"
                              icon={<MessageSquare className="h-3.5 w-3.5" />}
                              isDisabled={isBusy}
                              onClick={() => openConversation(item)}
                            />
                          ) : null}
                          {internalHref ? (
                            <AppButton
                              label="Mở"
                              variant="secondary"
                              size="sm"
                              icon={<ExternalLink className="h-3.5 w-3.5" />}
                              href={internalHref}
                              onClick={() => {
                                if (!item.isRead) void handleMarkRead(item.id);
                              }}
                            />
                          ) : null}
                          {!item.isRead ? (
                            <AppButton
                              label="Đánh dấu đã đọc"
                              variant="ghost"
                              size="sm"
                              icon={<MailOpen className="h-3.5 w-3.5" />}
                              isLoading={isBusy}
                              onClick={() => void handleMarkRead(item.id)}
                            />
                          ) : null}
                          <AppIconButton
                            label="Xóa thông báo"
                            icon={<Trash2 className="h-4 w-4 text-error" />}
                            isDisabled={isBusy}
                            onClick={() => void handleDeleteOne(item.id)}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}

      {effectiveTotal > 0 ? (
        <AppPagination
          page={page}
          pageSize={pageSize}
          totalItems={effectiveTotal}
          pageSizeOptions={[10, 20, 50]}
          onPageChange={setPage}
          onPageSizeChange={(nextSize) => {
            setPageSize(nextSize);
            setPage(1);
          }}
          itemLabel="thông báo"
        />
      ) : null}

      <ConfirmDialog
        isOpen={deleteAllOpen}
        onOpenChange={setDeleteAllOpen}
        title="Xóa toàn bộ thông báo?"
        description="Tất cả thông báo trong hộp thư của bạn sẽ bị xóa vĩnh viễn và không thể khôi phục."
        confirmLabel="Xóa tất cả"
        confirmVariant="destructive"
        isLoading={isDeletingAll}
        onConfirm={handleDeleteAll}
      />

      {activeComplaint ? (
        <NotificationConversationDialog
          key={activeComplaint.id}
          notification={activeComplaint}
          onClose={() => setActiveComplaint(null)}
        />
      ) : null}
    </PageFrame>
  );
}
