"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Cross2Icon, InfoCircledIcon } from "@radix-ui/react-icons";
import { useAuth } from "@/features/auth/AuthProvider";
import { notify } from "@/components/ui/Toaster";
import { notificationApi } from "../services/notificationApi";
import { EnumCodeNoti, type NotificationItem } from "../types";
import "./NotificationConversationDialog.css";

interface Props {
  notification: NotificationItem;
  onClose: () => void;
}

const timeFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : timeFormatter.format(date);
}

export function NotificationConversationDialog({ notification, onClose }: Props) {
  const { user } = useAuth();
  const currentUserId = user?.id ?? "";
  const alertGroupId = notification.alertGroupId ?? "";
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = reply.trim();
    if (submitting || !message || !currentUserId || !notification.senderUserId) return;

    setSubmitting(true);
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
      notify(
        "error",
        cause instanceof Error && cause.message === "UNAUTHORIZED"
          ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
          : "Không gửi được nội dung. Vui lòng thử lại."
      );
    } finally {
      setSubmitting(false);
    }
  }

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
        <h2 id="notification-conv-title">Trao đổi khiếu nại</h2>
        <button
          type="button"
          className="notification-conv__close"
          aria-label="Đóng"
          disabled={submitting}
          onClick={onClose}
        >
          <Cross2Icon aria-hidden="true" />
        </button>
      </header>

      <div ref={bodyRef} className="notification-conv__body" aria-busy={loading}>
        {loading && !messages.length ? (
          <div className="notification-conv__state" role="status">
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
        ) : !messages.length ? (
          <div className="notification-conv__state">Chưa có tin nhắn.</div>
        ) : (
          <ul className="notification-conv__list">
            {messages.map((entry) => {
              if (entry.codeNoti === EnumCodeNoti.COMPLAINT_ADMIN) {
                return (
                  <li key={entry.id} className="notification-conv__msg" data-admin-info="true">
                    <div className="notification-conv__adminBanner">
                      <span className="notification-conv__adminIcon" aria-hidden="true">
                        <InfoCircledIcon />
                      </span>
                      <span>{entry.message}</span>
                    </div>
                  </li>
                );
              }

              const isMine = entry.senderUserId === currentUserId;
              const sender = isMine
                ? "Bạn"
                : [entry.userName, entry.userSystemCode].filter(Boolean).join(" - ") ||
                  entry.senderUserId;
              const time = formatTime(entry.createdAt);

              return (
                <li key={entry.id} className="notification-conv__msg" data-mine={isMine}>
                  <div className="notification-conv__bubble">
                    <span className="notification-conv__sender">{sender}</span>
                    <span className="notification-conv__text">{entry.message}</span>
                    {time && <time className="notification-conv__time">{time}</time>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form className="notification-conv__footer" onSubmit={handleSubmit}>
        <textarea
          aria-label="Nhập nội dung phản hồi"
          className="notification-conv__textarea"
          value={reply}
          disabled={submitting}
          placeholder="Nhập nội dung..."
          onChange={(event) => setReply(event.target.value)}
        />
        <button
          type="submit"
          className="notification-conv__submitBtn"
          disabled={submitting || !reply.trim() || !currentUserId || !notification.senderUserId}
        >
          {submitting ? "..." : "GỬI"}
        </button>
      </form>
    </dialog>
  );
}
