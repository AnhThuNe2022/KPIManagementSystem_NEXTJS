"use client";

import React, {
  Fragment,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  CheckCheck,
  ChevronDown,
  Clock,
  FileText,
  Info,
  MessagesSquare,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Send,
  Users,
  X,
} from "lucide-react";
import { InlineErrorBanner, SurfaceDialog } from "@/components/ds";
import { useAuth } from "@/features/auth/AuthProvider";
import { getInitials } from "@/lib/format/formatters";
import { ApiRequestError, getErrorMessage, isAbortError } from "@/lib/http/request";
import { notificationApi } from "../services/notificationApi";
import { EnumCodeNoti, type NotificationItem } from "../types";

interface NotificationConversationDialogProps {
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

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.getFullYear() <= 1 ? null : date;
}

function getDayKey(date: Date | null): string {
  if (!date) return "";
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDayLabel(date: Date | null): string {
  if (!date) return "";
  const now = new Date();
  const todayKey = getDayKey(now);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const key = getDayKey(date);
  if (key === todayKey) return "Hôm nay";
  if (key === getDayKey(yesterday)) return "Hôm qua";
  return dayFormatter.format(date);
}

function hashAvatarTone(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 6;
}

function AdminNoticeCard({
  message,
  variant = "dossier",
}: {
  message: string;
  variant?: "dossier" | "inline";
}) {
  const [expanded, setExpanded] = useState(false);
  const lines = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const [headline = message, ...details] = lines;

  return (
    <div className="ds-conv-adminNotice" data-variant={variant}>
      <div className="ds-conv-dossierHeadline">
        {variant === "inline" ? (
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
        ) : null}
        <p className="m-0 text-xs font-semibold leading-relaxed text-primary">{headline}</p>
      </div>

      {details.length > 0 ? (
        <div className="mt-2.5 flex flex-col gap-2">
          {details.map((line, index) => {
            const colonIndex = line.indexOf(":");
            const hasLabel = colonIndex > 0 && colonIndex <= 24;
            if (!hasLabel) {
              return (
                <p key={index} className="m-0 text-xs leading-relaxed text-secondary">
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
                <div key={index} className="ds-conv-dossierField">
                  <button
                    type="button"
                    className="ds-conv-recipientToggle"
                    aria-expanded={expanded}
                    onClick={() => setExpanded((open) => !open)}
                  >
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <Users className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                      <span className="truncate">
                        {label} · <strong className="font-bold text-primary">{items.length} người nhận</strong>
                      </span>
                    </span>
                    <ChevronDown
                      className="ds-conv-chevron h-3.5 w-3.5 shrink-0"
                      data-open={expanded ? "true" : undefined}
                      aria-hidden="true"
                    />
                  </button>

                  {expanded ? (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {items.map((recipient, itemIndex) => (
                        <li key={itemIndex} className="ds-conv-recipientChip">
                          {recipient}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            }

            return (
              <div key={index} className="ds-conv-dossierField">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-secondary">
                  {label}
                </span>
                <p className="mt-0.5 mb-0 text-xs leading-relaxed text-primary break-words">
                  {value}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function NotificationConversationDialog({
  notification,
  onClose,
}: NotificationConversationDialogProps) {
  const { user } = useAuth();
  const currentUserId = user?.id ?? "";
  const alertGroupId = notification.alertGroupId ?? "";

  const titleId = useId();
  const dossierId = useId();
  const bodyRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState("");
  const [dossierOpen, setDossierOpen] = useState(true);
  const [mobileDossierExpanded, setMobileDossierExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!alertGroupId || !currentUserId) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setIsUnauthorized(false);

    notificationApi
      .getConversation(alertGroupId, currentUserId, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setMessages(rows);
      })
      .catch((cause: unknown) => {
        if (isAbortError(cause) || controller.signal.aborted) return;
        const unauth = cause instanceof ApiRequestError && cause.status === 401;
        setIsUnauthorized(unauth);
        setError(
          unauth
            ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
            : getErrorMessage(cause, "Không tải được cuộc trao đổi khiếu nại."),
        );
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
    !submitting &&
    Boolean(reply.trim()) &&
    Boolean(currentUserId) &&
    Boolean(notification.senderUserId);

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
      const unauth = cause instanceof ApiRequestError && cause.status === 401;
      setReplyError(
        unauth
          ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
          : getErrorMessage(cause, "Không gửi được nội dung. Vui lòng thử lại."),
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

  const peer = useMemo(
    () =>
      messages.find(
        (item) =>
          item.codeNoti !== EnumCodeNoti.COMPLAINT_ADMIN &&
          item.senderUserId &&
          item.senderUserId !== currentUserId,
      ) ?? (notification.senderUserId !== currentUserId ? notification : null),
    [currentUserId, messages, notification],
  );

  const peerName = peer?.userName?.trim() || peer?.senderUserId || "";
  const peerCode = peer?.userSystemCode?.trim() || "";
  const openingNotice = useMemo(
    () => messages.find((item) => item.codeNoti === EnumCodeNoti.COMPLAINT_ADMIN),
    [messages],
  );
  const thread = useMemo(
    () => (openingNotice ? messages.filter((item) => item !== openingNotice) : messages),
    [messages, openingNotice],
  );
  const openedOn = openingNotice ? parseDate(openingNotice.createdAt) : null;
  const showDossierPane = Boolean(openingNotice) && dossierOpen;

  return (
    <SurfaceDialog
      isOpen
      onOpenChange={(open) => {
        if (!open && !submitting) onClose();
      }}
      purpose="info"
      width="min(940px, calc(100vw - 24px))"
      maxHeight="min(680px, calc(100dvh - 36px))"
      className="ds-conv-dialog"
      labelledBy={titleId}
    >
      <div className="ds-conv-shell">
        {/* Clean Deoca Top-Stripe Header */}
        <header className="ds-conv-hero">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="ds-conv-heroIcon" aria-hidden="true">
              <MessagesSquare className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id={titleId} className="ds-conv-heroTitle truncate">
                  Trao đổi khiếu nại
                </h2>
                {thread.length > 0 ? (
                  <span className="ds-conv-countPill">{thread.length} tin nhắn</span>
                ) : null}
              </div>
              {peerName ? (
                <div className="mt-1 flex items-center gap-1.5 min-w-0">
                  <span
                    className="ds-avatar-grad h-5 w-5 text-[10px]"
                    data-tone={hashAvatarTone(peerName)}
                    aria-hidden="true"
                  >
                    {getInitials(peerName, "?")}
                  </span>
                  <span className="ds-conv-heroSub truncate">{peerName}</span>
                  {peerCode ? <span className="ds-company-pill">{peerCode}</span> : null}
                </div>
              ) : (
                <p className="ds-conv-heroSub m-0 mt-0.5 truncate">
                  Kênh trao đổi và phản hồi thông tin nhân sự
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {openingNotice ? (
              <button
                type="button"
                className="ds-conv-heroBtn ds-conv-dossierToggleBtn"
                aria-label={dossierOpen ? "Ẩn hồ sơ khiếu nại" : "Hiện hồ sơ khiếu nại"}
                title={dossierOpen ? "Ẩn hồ sơ khiếu nại" : "Hiện hồ sơ khiếu nại"}
                aria-pressed={dossierOpen}
                onClick={() => setDossierOpen((open) => !open)}
              >
                {dossierOpen ? (
                  <PanelRightClose className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            ) : null}
            <button
              type="button"
              className="ds-conv-heroBtn"
              aria-label="Tải lại tin nhắn"
              title="Tải lại tin nhắn"
              disabled={loading || submitting}
              data-spinning={loading && messages.length > 0 ? "true" : undefined}
              onClick={() => setRevision((value) => value + 1)}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="ds-conv-heroBtn"
              aria-label="Đóng hộp thoại"
              title="Đóng"
              disabled={submitting}
              onClick={onClose}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Flipped Two-Pane Workspace: Primary Thread Left + Collapsible Dossier Right */}
        <div
          className="ds-conv-workspace"
          data-has-dossier={showDossierPane ? "true" : "false"}
        >
          <section className="ds-conv-thread" aria-label="Luồng trao đổi">
            <div
              ref={bodyRef}
              className="ds-conv-body"
              aria-busy={loading}
              aria-label="Lịch sử tin nhắn"
              tabIndex={0}
            >
              {loading && messages.length === 0 ? (
                <div className="ds-conv-state" role="status">
                  <span className="ds-conv-spinner" aria-hidden="true" />
                  <p className="m-0 text-sm font-medium text-secondary">
                    Đang tải cuộc trao đổi…
                  </p>
                </div>
              ) : error ? (
                <div className="p-4">
                  <InlineErrorBanner
                    message={error}
                    isUnauthorized={isUnauthorized}
                    loginNextPath="/notifications"
                    onRetry={() => setRevision((value) => value + 1)}
                  />
                </div>
              ) : thread.length === 0 ? (
                <div className="ds-conv-state">
                  <span className="ds-conv-emptyOrb" aria-hidden="true">
                    <MessagesSquare className="h-6 w-6" />
                  </span>
                  <p className="m-0 max-w-xs text-center text-sm font-medium text-secondary">
                    Chưa có tin nhắn nào. Hãy viết phản hồi bên dưới để bắt đầu trao đổi.
                  </p>
                </div>
              ) : (
                <ol className="ds-conv-list">
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
                          {showDayDivider ? (
                            <li className="ds-conv-dayDivider" aria-hidden="true">
                              <span>{formatDayLabel(entryDate)}</span>
                            </li>
                          ) : null}
                          <li className="ds-conv-systemRow">
                            <AdminNoticeCard message={entry.message} variant="inline" />
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

                    const senderName =
                      entry.userName?.trim() || entry.senderUserId || "Người dùng";
                    const senderCode = entry.userSystemCode?.trim() || "";
                    const time = entryDate ? clockFormatter.format(entryDate) : "";

                    return (
                      <Fragment key={entry.id}>
                        {showDayDivider ? (
                          <li className="ds-conv-dayDivider" aria-hidden="true">
                            <span>{formatDayLabel(entryDate)}</span>
                          </li>
                        ) : null}
                        <li
                          className="ds-conv-msg"
                          data-mine={isMine ? "true" : "false"}
                          data-grouped={sameAsPrev ? "true" : undefined}
                          data-has-next={sameAsNext ? "true" : undefined}
                        >
                          {!isMine ? (
                            <span
                              className="ds-conv-avatarSlot"
                              data-hidden={sameAsPrev ? "true" : undefined}
                              aria-hidden="true"
                            >
                              {!sameAsPrev ? (
                                <span
                                  className="ds-avatar-grad h-8 w-8 text-xs"
                                  data-tone={hashAvatarTone(senderName)}
                                >
                                  {getInitials(senderName, "?")}
                                </span>
                              ) : null}
                            </span>
                          ) : null}

                          <div className="ds-conv-content">
                            {!isMine && !sameAsPrev ? (
                              <div className="ds-conv-senderRow">
                                <span className="text-xs font-bold text-primary truncate">
                                  {senderName}
                                </span>
                                {senderCode ? (
                                  <span className="ds-company-pill">{senderCode}</span>
                                ) : null}
                              </div>
                            ) : null}

                            <div className="ds-conv-bubble">
                              <p className="ds-conv-text">{entry.message}</p>
                              {time ? (
                                <span className="ds-conv-meta">
                                  <time dateTime={entry.createdAt ?? undefined}>{time}</time>
                                  {isMine ? (
                                    <CheckCheck className="h-3 w-3 opacity-80" aria-hidden="true" />
                                  ) : null}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      </Fragment>
                    );
                  })}
                </ol>
              )}
            </div>

            <form className="ds-conv-footer" onSubmit={handleSubmit}>
              {replyError ? (
                <p className="m-0 mb-2 text-xs font-semibold text-error" role="alert">
                  {replyError}
                </p>
              ) : null}

              <div className="ds-conv-composer">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  aria-label="Nhập nội dung phản hồi"
                  className="ds-conv-textarea"
                  value={reply}
                  disabled={submitting || !notification.senderUserId}
                  placeholder={
                    notification.senderUserId
                      ? "Viết phản hồi cho cuộc trao đổi..."
                      : "Không xác định được người nhận phản hồi."
                  }
                  onChange={(event) => {
                    setReply(event.target.value);
                    if (replyError) setReplyError("");
                  }}
                  onKeyDown={handleKeyDown}
                />
                <button
                  type="submit"
                  className="ds-conv-sendBtn"
                  disabled={!canSend}
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>{submitting ? "Đang gửi" : "Gửi"}</span>
                </button>
              </div>

              <p className="ds-conv-hint">
                <kbd className="ds-conv-kbd">Enter</kbd> để gửi ·{" "}
                <kbd className="ds-conv-kbd">Shift + Enter</kbd> xuống dòng
              </p>
            </form>
          </section>

          {showDossierPane && openingNotice ? (
            <aside
              className="ds-conv-dossier"
              aria-label="Hồ sơ khiếu nại"
              data-mobile-expanded={mobileDossierExpanded ? "true" : "false"}
            >
              <div className="ds-conv-dossierHead">
                <span className="ds-conv-dossierIcon" aria-hidden="true">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="m-0 text-sm font-bold text-primary">Hồ sơ khiếu nại</h3>
                  {openedOn ? (
                    <time
                      className="mt-0.5 inline-flex items-center gap-1 text-xs tabular-nums text-secondary"
                      dateTime={openingNotice.createdAt ?? undefined}
                    >
                      <Clock className="h-3 w-3 opacity-75" aria-hidden="true" />
                      <span>
                        {dayFormatter.format(openedOn)} · {clockFormatter.format(openedOn)}
                      </span>
                    </time>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="ds-conv-mobileDossierBtn"
                  aria-label="Mở rộng hồ sơ khiếu nại"
                  aria-expanded={mobileDossierExpanded}
                  aria-controls={dossierId}
                  onClick={() => setMobileDossierExpanded((open) => !open)}
                >
                  <ChevronDown
                    className="ds-conv-chevron h-4 w-4"
                    data-open={mobileDossierExpanded ? "true" : undefined}
                    aria-hidden="true"
                  />
                </button>
              </div>

              <div id={dossierId} className="ds-conv-dossierBody">
                <AdminNoticeCard message={openingNotice.message} variant="dossier" />
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </SurfaceDialog>
  );
}
