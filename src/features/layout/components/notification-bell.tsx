"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BellIcon, CheckIcon, ClockIcon, Cross2Icon, MagnifyingGlassIcon,
  EnvelopeClosedIcon, EnvelopeOpenIcon, InfoCircledIcon, TrashIcon,
} from "@radix-ui/react-icons";
import { notificationApi } from "@/features/user/service/notificationApi";
import type { NotificationItem, NotificationPage } from "@/types/notification";
import styles from "./notification-bell.module.css";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric",
});

function notificationDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.getFullYear() < 1900 ? "" : dateFormatter.format(date);
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }
  return "Không thể cập nhật thông báo lúc này. Vui lòng thử lại.";
}

function internalLink(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin && url.protocol === window.location.protocol
      ? url.pathname + url.search + url.hash : null;
  } catch {
    return null;
  }
}

function searchText(value: string) {
  return value.toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").trim();
}

export function NotificationBell() {
  const router = useRouter();
  const popupId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationPage | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const unread = data?.unreadCount ?? 0;
  const disabled = loading || busy;
  const items = data?.items ?? [];
  const recentUnread = items.filter((item) => !item.isRead).length;
  const term = searchText(query);
  // Search is scoped to the recent items returned by the existing API.
  const visibleItems = items.filter((item) => (!unreadOnly || !item.isRead) && searchText(item.message).includes(term));

  useLayoutEffect(() => {
    if (!open) return;
    function alignPointer() {
      const panel = panelRef.current;
      const bell = bellRef.current;
      if (panel && bell) {
        const anchor = bell.getBoundingClientRect();
        const bounds = panel.getBoundingClientRect();
        // Ignore the opening scale when measuring the arrow's resting position.
        const scale = bounds.width / panel.offsetWidth;
        const origin = parseFloat(getComputedStyle(panel).transformOrigin);
        const left = bounds.left - origin * (1 - scale);
        panel.style.setProperty("--anchor-x", `${anchor.left + anchor.width / 2 - left}px`);
      }
    }
    alignPointer();
    window.addEventListener("resize", alignPointer);
    return () => window.removeEventListener("resize", alignPointer);
  }, [open]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    notificationApi.getLatest(controller.signal)
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(errorMessage(cause)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus({ preventScroll: true });
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        bellRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function closePanel() {
    setOpen(false);
    bellRef.current?.focus();
  }

  async function mutate(action: () => Promise<unknown>, onSuccess?: () => void) {
    if (disabled) return;
    setBusy(true);
    setError("");
    try {
      await action();
      setRevision((value) => value + 1);
      if (panelRef.current?.contains(document.activeElement)) panelRef.current.focus({ preventScroll: true });
      onSuccess?.();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  function selectNotification(item: NotificationItem) {
    const href = internalLink(item.linkNoti);
    const navigate = () => { if (href) { closePanel(); router.push(href); } };
    if (item.isRead) navigate();
    else void mutate(() => notificationApi.markRead(item.id), navigate);
  }

  return (
    <div ref={rootRef} className={styles.root} onBlur={(event) => {
      if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button ref={bellRef} type="button" className={styles.bell}
        aria-label={unread ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
        aria-expanded={open} aria-haspopup="dialog" aria-controls={popupId}
        onClick={() => {
          if (open) closePanel();
          else { setOpen(true); setRevision((value) => value + 1); }
        }}>
        <BellIcon width={18} height={18} aria-hidden="true" />
        {unread > 0 && <span className={styles.badge} aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
      </button>
      <section ref={panelRef} id={popupId} role="dialog" tabIndex={-1}
        aria-labelledby={`${popupId}-title`} inert={!open}
        data-open={open} className={styles.panel}>
        <div className={styles.heading}>
          <span className={styles.headingIcon}><BellIcon width={20} height={20} aria-hidden="true" /></span>
          <div className={styles.headingText}>
            <h2 id={`${popupId}-title`}>Thông báo</h2>
            <p>{unread > 0 ? <><span className={styles.headingDot} />{unread} thông báo đang chờ bạn đọc</> : "Các cập nhật dành riêng cho bạn"}</p>
          </div>
          <button type="button" className={styles.iconButton} aria-label="Đóng thông báo" onClick={closePanel}>
            <Cross2Icon aria-hidden="true" />
          </button>
        </div>
        <div className={styles.searchBox}>
          <MagnifyingGlassIcon aria-hidden="true" />
          <label htmlFor={`${popupId}-search`} className={styles.srOnly}>Tìm trong thông báo gần đây</label>
          <input ref={searchRef} id={`${popupId}-search`} type="search" value={query}
            placeholder="Tìm trong thông báo gần đây…" autoComplete="off"
            onChange={(event) => setQuery(event.target.value)} />
          {query && <button type="button" className={styles.clearSearch} aria-label="Xóa từ khóa tìm kiếm"
            onClick={() => { setQuery(""); searchRef.current?.focus(); }}><Cross2Icon aria-hidden="true" /></button>}
        </div>
        <div className={styles.toolbar}>
          <div className={styles.filters} role="group" aria-label="Lọc thông báo gần đây" data-unread={unreadOnly}>
            <span className={styles.filterIndicator} aria-hidden="true" />
            <button type="button" className={styles.filter} aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>
              Tất cả<span>{items.length}</span>
            </button>
            <button type="button" className={styles.filter} aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>
              Chưa đọc<span>{recentUnread}</span>
            </button>
          </div>
          <button type="button" className={styles.textButton} disabled={disabled || unread === 0}
            aria-label="Đọc tất cả thông báo"
            onClick={() => void mutate(() => notificationApi.markAllRead())}><CheckIcon aria-hidden="true" />Đọc tất cả</button>
        </div>
        {error && <div role="alert" className={styles.error}>
          <InfoCircledIcon aria-hidden="true" /><span>{error}</span>
          <button type="button" className={styles.textButton} disabled={disabled} onClick={() => setRevision((value) => value + 1)}>Thử lại</button>
        </div>}
        <div className={styles.content} aria-busy={loading || busy}>
          {loading && !data ? (
            <div role="status" aria-label="Đang tải thông báo" className={styles.skeletons}>
              {[0, 1, 2].map((key) => <div key={key} className={styles.skeleton} aria-hidden="true"><i /><div><i /><i /></div></div>)}
            </div>
          ) : visibleItems.length ? (
              <ul className={styles.list}>
                {visibleItems.map((item) => {
                  const date = notificationDate(item.createdAt);
                  return <li key={item.id} className={styles.row} data-unread={!item.isRead}>
                    <span className={styles.itemIcon}>{item.isRead ? <EnvelopeOpenIcon aria-hidden="true" /> : <EnvelopeClosedIcon aria-hidden="true" />}</span>
                    <button type="button" className={styles.message} disabled={disabled}
                      title={item.message}
                      onClick={() => selectNotification(item)} aria-label={`${item.message}${item.isRead ? ", đã đọc" : ", đánh dấu đã đọc"}`}>
                      <span>{item.message}</span>
                      <span className={styles.messageMeta}>
                        {date && <><ClockIcon aria-hidden="true" /><time dateTime={item.createdAt ?? undefined}>{date}</time></>}
                        {!item.isRead && <span className={styles.unreadStatus}><i aria-hidden="true" />Chưa đọc</span>}
                      </span>
                    </button>
                    <div className={styles.rowActions}>
                      {!item.isRead && <button type="button" className={`${styles.iconButton} ${styles.readButton}`} disabled={disabled}
                        aria-label={`Đánh dấu đã đọc: ${item.message}`} title="Đánh dấu đã đọc"
                        onClick={() => void mutate(() => notificationApi.markRead(item.id))}><CheckIcon aria-hidden="true" /></button>}
                      <button type="button" className={`${styles.iconButton} ${styles.deleteButton}`} disabled={disabled}
                        title="Xóa thông báo"
                        aria-label={`Xóa thông báo: ${item.message}`} onClick={() => void mutate(() => notificationApi.deleteOne(item.id))}><TrashIcon aria-hidden="true" /></button>
                    </div>
                  </li>;
                })}
              </ul>
          ) : (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>{term ? <MagnifyingGlassIcon aria-hidden="true" /> : <EnvelopeOpenIcon aria-hidden="true" />}</span>
              <p>{error && !data ? "Chưa tải được thông báo" : term ? "Không tìm thấy thông báo" : unreadOnly ? "Không có thông báo chưa đọc" : "Chưa có thông báo"}</p>
              <span>{error && !data ? "Hãy thử tải lại sau ít phút." : term ? "Thử từ khóa khác hoặc bỏ bộ lọc đang chọn." : unreadOnly ? "Bạn đã xem hết các thông báo gần đây." : "Những cập nhật mới sẽ xuất hiện tại đây."}</span>
              {(term || unreadOnly) && items.length > 0 && <button type="button" className={styles.textButton}
                onClick={() => { setQuery(""); setUnreadOnly(false); }}>Xem tất cả thông báo gần đây</button>}
            </div>
          )}
        </div>
        <div className={styles.footer}>
          <span role="status" aria-live="polite" aria-atomic="true">
            {loading && !data ? "Đang tải cập nhật…" : data ? `${visibleItems.length}/${items.length} thông báo gần đây` : "Thông báo gần đây"}
          </span>
        </div>
      </section>
    </div>
  );
}
