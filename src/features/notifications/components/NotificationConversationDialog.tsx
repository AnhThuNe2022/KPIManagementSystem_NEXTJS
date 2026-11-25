"use client";

import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  ChatBubbleIcon,
  ChevronDownIcon,
  Cross2Icon,
  FileTextIcon,
  InfoCircledIcon,
  PaperPlaneIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { useAuth } from "@/features/auth/AuthProvider";
import { notificationApi } from "../services/notificationApi";
import { EnumCodeNoti, type NotificationItem } from "../types";
import "./NotificationConversationDialog.css";

interface Props {
  notification: NotificationItem;
  onClose: () => void;
}

const clockFormatter = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
});

const dayFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDayKey(date: Date | null) {
  if (!date) return "";
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDayLabel(date: Date | null) {
  if (!date) return "";
  const now = new Date();
  const todayKey = getDayKey(now);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const key = getDayKey(date);
  if (key === todayKey) return "Hôm nay";
  if (key === getDayKey(yesterday)) return "Hôm qua";
  return dayFormatter.format(date);
}

function getInitials(label: string) {
  const parts = label
    .trim()
    .split(/[\s_.-]+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return label.trim().slice(0, 2).toUpperCase() || "?";
}

function AdminNotice({ message }: { message: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const [headline = message, ...details] = lines;

  return (
    <div className="notification-conv__adminNotice">
      <p className="notification-conv__adminHeadline">
        <InfoCircledIcon className="notification-conv__adminIcon" aria-hidden="true" />
        <span>{headline}</span>
      </p>

      {details.length > 0 && (
        <div className="notification-conv__adminDetails">
          {details.map((line, index) => {
            const colonIndex = line.indexOf(":");
            const hasLabel = colonIndex > 0 && colonIndex <= 24;
            if (!hasLabel) {
              return (
                <p key={index} className="notification-conv__adminLine">
                  {line}
                </p>
              );
            }

            const label = line.slice(0, colonIndex).trim();
            const value = line.slice(colonIndex + 1).trim();
            const items = value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);

            if (label.toLocaleLowerCase("vi") === "đã gửi tới" && items.length >= 3) {
              return (
                <div key={index} className="notification-conv__adminRecipients">
                  <button
                    type="button"
                    className="notification-conv__adminToggle"
                    aria-expanded={expanded}
                    onClick={() => setExpanded((open) => !open)}
                  >
                    <span>
                      {label} · <strong>{items.length} người nhận</strong>
                    </span>
                    <ChevronDownIcon
                      className="notification-conv__adminChevron"
                      data-open={expanded ? "true" : undefined}
                      aria-hidden="true"
                    />
                  </button>

                  {expanded && (
                    <ul className="notification-conv__recipientList">
                      {items.map((recipient, itemIndex) => (
                        <li key={itemIndex} className="notification-conv__recipientChip">
                          {recipient}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            }

            return (
              <p key={index} className="notification-conv__adminLine">
                <span className="notification-conv__adminLabel">{label}:</span>{" "}
                <span className="notification-conv__adminValue">{value}</span>
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function NotificationConversationDialog({ notification, onClose }: Props) {
  const { user } = useAuth();
  const currentUserId = user?.id ?? "";
  const alertGroupId = notification.alertGroupId ?? "";
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contextId = useId();

  const [messages, setMessages] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState("");
  const [contextExpanded, setContextExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!alertGroupId || !currentUserId) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");

    notificationApi
      .getConversation(alertGroupId, currentUserId, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setMessages(rows);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error && cause.message === "UNAUTHORIZED"
              ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
              : "Không tải được cuộc trao đổi khiếu nại."
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [alertGroupId, currentUserId, revision]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [reply]);

  const canSend =
    !submitting && Boolean(reply.trim()) && Boolean(currentUserId) && Boolean(notification.senderUserId);

  async function sendReply() {
    const message = reply.trim();
    if (submitting || !message || !currentUserId || !notification.senderUserId) return;

    setSubmitting(true);
    setReplyError("");
    try {
      await notificationApi.sendMessage({
        alertGroupId,
        userId: notification.senderUserId,
        senderUserId: currentUserId,
        codeNoti: EnumCodeNoti.RESOLVED,
        message,
        resolvedAt: new Date().toISOString(),
        resolvedBy: currentUserId,
      });
      setReply("");
      setRevision((value) => value + 1);
    } catch (cause: unknown) {
      setReplyError(
        cause instanceof Error && cause.message === "UNAUTHORIZED"
          ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
          : "Không gửi được nội dung. Vui lòng thử lại."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendReply();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (canSend) void sendReply();
    }
  }

  const peer =
    messages.find(
      (item) =>
        item.codeNoti !== EnumCodeNoti.COMPLAINT_ADMIN &&
        item.senderUserId &&
        item.senderUserId !== currentUserId
    ) ?? (notification.senderUserId !== currentUserId ? notification : null);

  const peerLabel = peer
    ? [peer.userName, peer.userSystemCode].filter(Boolean).join(" · ")
    : "";
  const openingNotice = messages.find((item) => item.codeNoti === EnumCodeNoti.COMPLAINT_ADMIN);
  const thread = openingNotice ? messages.filter((item) => item !== openingNotice) : messages;
  const openedOn = openingNotice ? parseDate(openingNotice.createdAt) : null;

  return (
    <dialog
      ref={dialogRef}
      className="notification-conv__dialog"
      aria-labelledby="notification-conv-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!submitting) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <header className="notification-conv__header">
        <div className="notification-conv__heading">
          <span className="notification-conv__icon" aria-hidden="true">
            <ChatBubbleIcon />
          </span>
          <div className="notification-conv__titles">
            <h2 id="notification-conv-title">Trao đổi khiếu nại</h2>
            {peerLabel && <p className="notification-conv__subtitle">{peerLabel}</p>}
          </div>
        </div>

        <div className="notification-conv__actions">
          <button
            type="button"
            className="notification-conv__iconBtn"
            aria-label="Tải lại tin nhắn"
            title="Tải lại tin nhắn"
            disabled={loading || submitting}
            data-spinning={loading && messages.length > 0 ? "true" : undefined}
            onClick={() => setRevision((value) => value + 1)}
          >
            <ReloadIcon aria-hidden="true" />
          </button>
          <button
            type="button"
            className="notification-conv__iconBtn"
            aria-label="Đóng"
            title="Đóng"
            disabled={submitting}
            onClick={onClose}
          >
            <Cross2Icon aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="notification-conv__workspace" data-has-notice={Boolean(openingNotice)}>
        {openingNotice && (
          <aside className="notification-conv__context" aria-label="Thông tin khiếu nại" data-expanded={contextExpanded}>
            <div className="notification-conv__contextHeading">
              <FileTextIcon aria-hidden="true" />
              <h3>Thông tin khiếu nại</h3>
              <button
                type="button"
                className="notification-conv__contextToggle"
                aria-label="Chi tiết khiếu nại"
                aria-expanded={contextExpanded}
                aria-controls={contextId}
                onClick={() => setContextExpanded((open) => !open)}
              >
                <ChevronDownIcon aria-hidden="true" />
              </button>
            </div>
            {openedOn && (
              <time className="notification-conv__contextDate" dateTime={openingNotice.createdAt ?? undefined}>
                {dayFormatter.format(openedOn)} · {clockFormatter.format(openedOn)}
              </time>
            )}
            <div id={contextId} className="notification-conv__contextDetails">
              <AdminNotice message={openingNotice.message} />
            </div>
          </aside>
        )}

        <section className="notification-conv__thread" aria-label="Trao đổi">
          <div ref={bodyRef} className="notification-conv__body" aria-busy={loading} aria-label="Lịch sử tin nhắn" tabIndex={0}>
            {loading && !messages.length ? (
              <div className="notification-conv__empty" role="status">
                Đang tải tin nhắn…
              </div>
            ) : error ? (
              <div className="notification-conv__errorBox" role="alert">
                <span>{error}</span>
                <button
                  type="button"
                  className="notification-conv__retryBtn"
                  onClick={() => setRevision((value) => value + 1)}
                >
                  Thử lại
                </button>
              </div>
            ) : !thread.length ? (
              <div className="notification-conv__empty">
                <span className="notification-conv__emptyIcon" aria-hidden="true">
                  <ChatBubbleIcon />
                </span>
                <p>Chưa có tin nhắn. Bạn có thể viết phản hồi bên dưới.</p>
              </div>
            ) : (
              <ol className="notification-conv__list">
                {thread.map((entry, index) => {
                  const prev = thread[index - 1];
                  const next = thread[index + 1];
                  const entryDate = parseDate(entry.createdAt);
                  const prevDate = prev ? parseDate(prev.createdAt) : null;
                  const nextDate = next ? parseDate(next.createdAt) : null;
                  const dayKey = getDayKey(entryDate);
                  const prevDayKey = getDayKey(prevDate);
                  const nextDayKey = getDayKey(nextDate);
                  const showDayDivider = Boolean(dayKey) && dayKey !== prevDayKey;

                  if (entry.codeNoti === EnumCodeNoti.COMPLAINT_ADMIN) {
                    return (
                      <Fragment key={entry.id}>
                        {showDayDivider && (
                          <li className="notification-conv__dayDivider" aria-hidden="true">
                            <span>{formatDayLabel(entryDate)}</span>
                          </li>
                        )}
                        <li className="notification-conv__msg" data-admin-info="true">
                          <AdminNotice message={entry.message} />
                        </li>
                      </Fragment>
                    );
                  }

                  const isMine = entry.senderUserId === currentUserId;
                  const sameAsPrev =
                    !showDayDivider &&
                    Boolean(prev) &&
                    prev.codeNoti !== EnumCodeNoti.COMPLAINT_ADMIN &&
                    prev.senderUserId === entry.senderUserId;
                  const sameAsNext =
                    Boolean(next) &&
                    next.codeNoti !== EnumCodeNoti.COMPLAINT_ADMIN &&
                    next.senderUserId === entry.senderUserId &&
                    dayKey === nextDayKey;

                  const senderName = entry.userName?.trim() || entry.senderUserId || "Người dùng";
                  const senderCode = entry.userSystemCode?.trim() || "";
                  const time = entryDate ? clockFormatter.format(entryDate) : "";

                  return (
                    <Fragment key={entry.id}>
                      {showDayDivider && (
                        <li className="notification-conv__dayDivider" aria-hidden="true">
                          <span>{formatDayLabel(entryDate)}</span>
                        </li>
                      )}
                      <li
                        className="notification-conv__msg"
                        data-mine={isMine}
                        data-grouped={sameAsPrev ? "true" : undefined}
                        data-has-next={sameAsNext ? "true" : undefined}
                      >
                        {!isMine && (
                          <span
                            className="notification-conv__avatar"
                            data-hidden={sameAsPrev ? "true" : undefined}
                            aria-hidden="true"
                          >
                            {!sameAsPrev && getInitials(senderName)}
                          </span>
                        )}

                        <div className="notification-conv__content">
                          {!isMine && !sameAsPrev && (
                            <div className="notification-conv__senderRow">
                              <span className="notification-conv__senderName">{senderName}</span>
                              {senderCode && (
                                <span className="notification-conv__senderCode">{senderCode}</span>
                              )}
                            </div>
                          )}

                          <div className="notification-conv__bubble">
                            <p className="notification-conv__text">{entry.message}</p>
                            {time && (
                              <time
                                className="notification-conv__time"
                                dateTime={entry.createdAt ?? undefined}
                              >
                                {time}
                              </time>
                            )}
                          </div>
                        </div>
                      </li>
                    </Fragment>
                  );
                })}
              </ol>
            )}
          </div>

          <form className="notification-conv__footer" onSubmit={handleSubmit}>
            {replyError && <p className="notification-conv__replyError" role="alert">{replyError}</p>}
            <div className="notification-conv__composer">
              <textarea
                ref={textareaRef}
                rows={1}
                aria-label="Nhập nội dung phản hồi"
                className="notification-conv__textarea"
                value={reply}
                disabled={submitting}
                placeholder="Viết phản hồi..."
                onChange={(event) => {
                  setReply(event.target.value);
                  if (replyError) setReplyError("");
                }}
                onKeyDown={handleKeyDown}
              />
              <button
                type="submit"
                className="notification-conv__submitBtn"
                disabled={!canSend}
              >
                <PaperPlaneIcon aria-hidden="true" />
                <span>{submitting ? "Đang gửi" : "Gửi"}</span>
              </button>
            </div>
            <p className="notification-conv__hint">Enter để gửi · Shift + Enter để xuống dòng</p>
          </form>
        </section>
      </div>
    </dialog>
  );
}
