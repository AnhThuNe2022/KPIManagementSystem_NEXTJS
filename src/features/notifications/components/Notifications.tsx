"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  BellIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  Cross2Icon,
  DashboardIcon,
  EnvelopeClosedIcon,
  EnvelopeOpenIcon,
  FileTextIcon,
  InfoCircledIcon,
  MagnifyingGlassIcon,
  PersonIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { notificationApi, NOTIFICATIONS_CHANGED } from "@/features/notifications/services/notificationApi";
import type { NotificationItem, NotificationPage } from "@/features/notifications/types";
import "./Notifications.css";
import { searchText, internalNotificationLink } from "@/features/notifications/notificationUtils";
import { Pagination } from "@/components/ui/Pagination";
import { notify } from "@/components/ui/Toaster";

type Status = "all" | "unread" | "read";
const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
});

function notificationDate(value: string | null) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) && date.getFullYear() >= 1900
    ? dateFormatter.format(date)
    : "";
}

function notificationDay(value: string | null) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime()) || date.getFullYear() < 1900) return "";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Hôm nay";
  if (date.toDateString() === yesterday.toDateString()) return "Hôm qua";
  return date.toLocaleDateString("vi-VN");
}

export function Notifications() {
  const router = useRouter();
  const confirmRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [snapshot, setSnapshot] = useState<{ data: NotificationPage; key: string } | null>(null);
  const [status, setStatus] = useState<Status>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const term = searchText(query);
  const filtering = status !== "all" || term.length > 0;
  const requestPage = filtering ? 1 : page;
  const requestSize = filtering ? 20 : pageSize;
  const requestKey = filtering ? "filtered" : `${page}:${pageSize}`;
  const data = snapshot?.data;
  const ready = snapshot?.key === requestKey;
  const matches = (data?.items ?? []).filter(
    (item) =>
      (status === "all" || (status === "read" ? item.isRead : !item.isRead)) &&
      searchText(item.message).includes(term),
  );
  const total = filtering ? matches.length : (data?.total ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const items = filtering
    ? matches.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : matches;
  const disabled = busy || loading || !ready;
  const readCount = Math.max(0, (data?.total ?? 0) - (data?.unreadCount ?? 0));
  const groups = new Map<string, NotificationItem[]>();
  for (const item of items) {
    const day = notificationDay(item.createdAt);
    const group = groups.get(day);
    if (group) group.push(item);
    else groups.set(day, [item]);
  }

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener(NOTIFICATIONS_CHANGED, refresh);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED, refresh);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const request = notificationApi.get({
      page: requestPage,
      pageSize: requestSize,
      all: filtering,
      signal: controller.signal,
    });
    request
      .then((result) => {
        if (controller.signal.aborted) return;
        setSnapshot({ data: result, key: requestKey });
        if (!filtering)
          setPage((value) => Math.min(value, Math.max(1, Math.ceil(result.total / requestSize))));
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error && cause.message === "UNAUTHORIZED"
              ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
              : "Không tải được thông báo. Vui lòng thử lại.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filtering, requestPage, requestSize, requestKey, revision]);

  async function mutate(action: () => Promise<unknown>, message: string, onSuccess?: () => void) {
    if (disabled) return;
    setBusy(true);
    setError("");
    try {
      await action();
      notify("success", message);
      onSuccess?.();
    } catch (cause) {
      const message = cause instanceof Error && cause.message === "UNAUTHORIZED"
        ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        : "Không cập nhật được thông báo. Vui lòng thử lại.";
      setError(message);
      notify("error", message);
    } finally {
      setBusy(false);
    }
  }

  function selectNotification(item: NotificationItem) {
    const href = internalNotificationLink(item.linkNoti);
    const navigate = () => {
      if (href) router.push(href);
    };
    if (item.isRead) navigate();
    else void mutate(() => notificationApi.markRead(item.id), "Đã đánh dấu thông báo là đã đọc.", navigate);
  }

  return (
    <div className="notifications__page" data-ui>
      <h1 className="notifications__srOnly">Thông báo</h1>

      <div className="notifications__workspace">
        <aside className="notifications__overview" aria-label="Tổng quan thông báo">
          <div className="notifications__summary">
            <div className="notifications__summaryLabel">
              <span>Hộp thư của bạn</span>
              <span className="notifications__summaryBell">
                <BellIcon aria-hidden="true" />
              </span>
            </div>
            <div className="notifications__summaryCount">
              <strong>{data?.unreadCount ?? "—"}</strong>
              <span>chưa đọc</span>
            </div>
            <progress
              className="notifications__readProgress"
              value={readCount}
              max={Math.max(data?.total ?? 0, 1)}
              aria-label="Số thông báo đã đọc"
            />
            <p>
              {readCount} / {data?.total ?? 0} thông báo đã đọc
            </p>
          </div>
          <div className="notifications__overviewBody">
            <div
              className="notifications__filters"
              role="group"
              aria-label="Lọc trạng thái thông báo"
              data-active={status}
            >
              <span className="notifications__filterIndicator" aria-hidden="true" />
              {(
                [
                  ["all", "Tất cả", BellIcon],
                  ["unread", "Chưa đọc", EnvelopeClosedIcon],
                  ["read", "Đã đọc", CheckIcon],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={status === value}
                  disabled={busy}
                  onClick={() => {
                    setStatus(value);
                    setPage(1);
                  }}
                >
                  <Icon aria-hidden="true" />
                  {label}
                  <span>
                    {data
                      ? value === "all"
                        ? data.total
                        : value === "unread"
                          ? data.unreadCount
                          : Math.max(0, data.total - data.unreadCount)
                      : "—"}
                  </span>
                </button>
              ))}
            </div>
            <nav className="notifications__quickLinks" aria-label="Truy cập nhanh">
              <h2>Truy cập nhanh</h2>
              {(
                [
                  ["/dashboard", "Tổng quan KPI", DashboardIcon],
                  ["/my-evaluation", "Bản đánh giá của tôi", FileTextIcon],
                  ["/user-infor", "Thông tin cá nhân", PersonIcon],
                ] as const
              ).map(([href, label, Icon]) => (
                <Link key={href} href={href}>
                  <span className="notifications__quickLinkIcon">
                    <Icon aria-hidden="true" />
                  </span>
                  <span>{label}</span>
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        <section className="notifications__inbox" aria-label="Danh sách thông báo">
          <div className="notifications__toolbar">
            <div className="notifications__streamHeading">
              <span className="notifications__streamIcon">
                <EnvelopeOpenIcon aria-hidden="true" />
              </span>
              <div className="notifications__streamTitle">
                <h2>
                  {status === "unread"
                    ? "Chưa đọc"
                    : status === "read"
                      ? "Đã đọc"
                      : "Tất cả thông báo"}
                </h2>
                <span>
                  {ready
                    ? `${total} thông báo${term ? " phù hợp" : ""}`
                    : error
                      ? "Chưa tải được dữ liệu"
                      : "Đang tải…"}
                </span>
              </div>
            </div>
            <div className="notifications__toolbarControls">
              <div className="notifications__actions">
                <button
                  type="button"
                  className={`notifications__button notifications__primary`}
                  disabled={disabled || !data?.unreadCount}
                  onClick={() => void mutate(() => notificationApi.markAllRead(), "Đã đánh dấu tất cả thông báo là đã đọc.")}
                >
                  <CheckIcon aria-hidden="true" />
                  Đọc tất cả
                </button>
                <button
                  type="button"
                  className={`notifications__button notifications__danger`}
                  disabled={disabled || !data?.total}
                  onClick={() => confirmRef.current?.showModal()}
                >
                  <TrashIcon aria-hidden="true" />
                  Xóa tất cả
                </button>
              </div>
              <div className="notifications__search" role="search">
                <MagnifyingGlassIcon aria-hidden="true" />
                <label htmlFor="notifications-search" className="notifications__srOnly">
                  Tìm thông báo
                </label>
                <input
                  ref={searchRef}
                  id="notifications-search"
                  type="search"
                  value={query}
                  placeholder="Tìm nội dung thông báo…"
                  autoComplete="off"
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Xóa từ khóa tìm kiếm"
                    onClick={() => {
                      setQuery("");
                      setPage(1);
                      searchRef.current?.focus();
                    }}
                  >
                    <Cross2Icon aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="notifications__error" role="alert">
              <InfoCircledIcon aria-hidden="true" />
              <span>{error}</span>
              <button
                type="button"
                className="notifications__retry"
                disabled={loading || busy}
                onClick={() => setRevision((value) => value + 1)}
              >
                Thử lại
              </button>
            </div>
          )}

          <div className="notifications__content" aria-busy={loading || busy}>
            {!ready && (loading || !error) ? (
              <div className="notifications__skeletons" role="status" aria-label="Đang tải thông báo">
                {[0, 1, 2, 3].map((key) => (
                  <div className="notifications__skeleton" key={key} aria-hidden="true">
                    <i />
                    <div>
                      <i />
                      <i />
                    </div>
                  </div>
                ))}
              </div>
            ) : ready && items.length ? (
              <div className="notifications__groups">
                {Array.from(groups, ([day, dayItems]) => (
                  <section key={day} className="notifications__group" aria-label={day || "Thông báo khác"}>
                    {day && (
                      <h3 className="notifications__groupTitle">
                        <CalendarIcon aria-hidden="true" />
                        {day}
                        <span>{dayItems.length}</span>
                      </h3>
                    )}
                    <ul className="notifications__list">
                      {dayItems.map((item) => {
                        const date = notificationDate(item.createdAt);
                        return (
                          <li key={item.id} className="notifications__row" data-unread={!item.isRead}>
                            <span className="notifications__itemIcon">
                              {item.isRead ? (
                                <EnvelopeOpenIcon aria-hidden="true" />
                              ) : (
                                <EnvelopeClosedIcon aria-hidden="true" />
                              )}
                            </span>
                            <div className="notifications__message">
                              <button
                                type="button"
                                disabled={disabled || (item.isRead && !item.linkNoti)}
                                title={item.message}
                                onClick={() => selectNotification(item)}
                                aria-label={`${item.message}${item.isRead ? "" : ", đánh dấu đã đọc"}`}
                              >
                                {item.message}
                              </button>
                              <div className="notifications__meta">
                                <span className="notifications__timestamp">
                                  {date && (
                                    <>
                                      <ClockIcon aria-hidden="true" />
                                      <time dateTime={item.createdAt ?? undefined}>{date}</time>
                                    </>
                                  )}
                                </span>
                                <span className="notifications__status">
                                  {item.isRead ? (
                                    <CheckIcon aria-hidden="true" />
                                  ) : (
                                    <i aria-hidden="true" />
                                  )}
                                  {item.isRead ? "Đã đọc" : "Chưa đọc"}
                                </span>
                              </div>
                            </div>
                            <div className="notifications__rowActions">
                              {!item.isRead && (
                                <button
                                  type="button"
                                  className="notifications__iconButton"
                                  disabled={disabled}
                                  title="Đánh dấu đã đọc"
                                  aria-label={`Đánh dấu đã đọc: ${item.message}`}
                                  onClick={() =>
                                    void mutate(() => notificationApi.markRead(item.id), "Đã đánh dấu thông báo là đã đọc.")
                                  }
                                >
                                  <CheckIcon aria-hidden="true" />
                                </button>
                              )}
                              <button
                                type="button"
                                className={`notifications__iconButton notifications__danger`}
                                disabled={disabled}
                                title="Xóa thông báo"
                                aria-label={`Xóa thông báo: ${item.message}`}
                                onClick={() =>
                                  void mutate(() => notificationApi.deleteOne(item.id), "Đã xóa thông báo.")
                                }
                              >
                                <TrashIcon aria-hidden="true" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            ) : (
              <div className="notifications__empty">
                <span className="notifications__emptyIcon">
                  {error && !ready ? (
                    <InfoCircledIcon aria-hidden="true" />
                  ) : term ? (
                    <MagnifyingGlassIcon aria-hidden="true" />
                  ) : (
                    <BellIcon aria-hidden="true" />
                  )}
                </span>
                <h2>
                  {error && !ready
                    ? "Chưa tải được thông báo"
                    : term
                      ? "Không tìm thấy thông báo"
                      : status === "unread"
                        ? "Bạn đã đọc hết rồi"
                        : "Chưa có thông báo"}
                </h2>
                <p>
                  {error && !ready
                    ? "Thử tải lại để xem các cập nhật mới nhất."
                    : term
                      ? "Thử từ khóa khác hoặc bỏ bộ lọc trạng thái."
                      : status === "unread"
                        ? "Mọi cập nhật đều đã được bạn xem."
                        : "Các cập nhật công việc sẽ xuất hiện tại đây."}
                </p>
                {filtering && !error && (
                  <button
                    type="button"
                    className="notifications__button"
                    onClick={() => {
                      setQuery("");
                      setStatus("all");
                      setPage(1);
                    }}
                  >
                    Xem tất cả thông báo
                  </button>
                )}
              </div>
            )}
          </div>

          <Pagination
            itemLabel="thông báo"
            page={currentPage}
            pageSize={pageSize}
            total={ready ? total : null}
            loading={loading}
            error={Boolean(error) && !ready}
            disabled={busy || !ready}
            pageSizeOptions={[10, 20]}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        </section>
      </div>

      <dialog
        ref={confirmRef}
        className="notifications__dialog"
        aria-labelledby="delete-notifications-title"
        aria-describedby="delete-notifications-description"
      >
        <span className={`notifications__emptyIcon notifications__danger`}>
          <TrashIcon aria-hidden="true" />
        </span>
        <h2 id="delete-notifications-title">Xóa tất cả thông báo?</h2>
        <p id="delete-notifications-description">
          Toàn bộ {data?.total ?? 0} thông báo, gồm cả đã đọc và chưa đọc, sẽ bị xóa. Bạn không thể
          khôi phục sau khi xóa.
        </p>
        <div className="notifications__actions">
          <button
            type="button"
            className="notifications__button"
            autoFocus
            disabled={busy}
            onClick={() => confirmRef.current?.close()}
          >
            Giữ lại
          </button>
          <button
            type="button"
            className={`notifications__button notifications__deleteConfirm`}
            disabled={disabled}
            onClick={() =>
              void mutate(
                () => notificationApi.deleteAll(),
                "Đã xóa tất cả thông báo.",
                () => {
                  confirmRef.current?.close();
                  setPage(1);
                },
              )
            }
          >
            {busy ? "Đang xóa…" : "Xóa tất cả"}
          </button>
        </div>
        {error && (
          <p role="alert" className="notifications__dialogError">
            {error}
          </p>
        )}
      </dialog>
    </div>
  );
}
