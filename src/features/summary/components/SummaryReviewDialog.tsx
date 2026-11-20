"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckIcon, Cross2Icon, PaperPlaneIcon, PersonIcon, ReloadIcon, ResetIcon } from "@radix-ui/react-icons";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { notify } from "@/components/ui/Toaster";
import { userOrganizationApi, type AvailableManager } from "@/features/user/services/userOrganizationApi";
import { requestMessage } from "@/features/evaluation/evaluationDisplay";
import { summaryApi, type ReviewCustomUser } from "../services/summaryApi";
import type { SummaryDetail } from "../types";

export type SummaryReviewTarget = { kind: "approve" | "reject"; rows: SummaryDetail[]; all?: boolean };
type Props = {
  target: SummaryReviewTarget;
  level: number;
  onClose: () => void;
  onProcessed: (ids: number[]) => void;
};

export function SummaryReviewDialog({ target, level, onClose, onProcessed }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const closing = useRef(false);
  const [remaining, setRemaining] = useState(target.rows);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [managers, setManagers] = useState<AvailableManager[]>([]);
  const [managerIds, setManagerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(target.kind === "approve");
  const [lookupError, setLookupError] = useState("");
  const [revision, setRevision] = useState(0);
  const approving = target.kind === "approve";

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
    };
  }, []);

  useEffect(() => {
    if (!approving) return;
    const controller = new AbortController();
    setLoading(true);
    setLookupError("");
    userOrganizationApi.getAvailableManagers(controller.signal).then(result => {
      if (!controller.signal.aborted) setManagers(result.items);
    }).catch(cause => {
      if (!controller.signal.aborted) setLookupError(requestMessage(cause, "Chưa tải được người duyệt. Hãy thử lại."));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [approving, revision]);

  function close() {
    if (submitting.current || closing.current) return;
    closing.current = true;
    const element = dialog.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    element.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(8px) scale(.98)" }], {
      duration: 140, easing: "ease-in", fill: "forwards",
    }).finished.catch(() => {}).then(onClose);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current || closing.current || !remaining.length || (!approving && !comment.trim())) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    const processed: number[] = [];
    let firstFailure: { row: SummaryDetail; cause: unknown } | null = null;
    let complete = false;
    try {
      if (approving) {
        const selected: ReviewCustomUser[] = managers
          .filter(manager => managerIds.includes(String(manager.id)))
          .map(manager => ({
            Id: Number(manager.id),
            UserId: manager.userId ?? "",
            SystemCode: manager.systemCode ?? manager.employeeCode ?? "",
            JobTitle: manager.jobTitle ?? manager.jobPositionName ?? "",
            CompanyId: manager.companyId ?? null,
            DepartmentId: manager.departmentId ?? null,
          }));
        await summaryApi.approve(remaining.map(row => row.evalId), level, selected);
        processed.push(...remaining.map(row => row.evalId));
      } else {
        for (const row of remaining) {
          try {
            await summaryApi.reject(row.evalId, level, comment.trim());
            processed.push(row.evalId);
          } catch (cause) {
            firstFailure ??= { row, cause };
            if (cause instanceof Error && (cause.message === "UNAUTHORIZED" || cause.name === "TypeError")) break;
          }
        }
        if (firstFailure) throw firstFailure.cause;
      }
      notify("success", (approving ? "Đã gửi duyệt " : "Đã trả về ") + processed.length + " bản đánh giá.");
      complete = true;
    } catch (cause) {
      const message = cause instanceof Error && cause.message === "FORBIDDEN"
        ? "Bạn chưa được cấp quyền thực hiện thao tác này."
        : requestMessage(cause, cause instanceof Error ? cause.message : "Chưa hoàn tất thao tác. Hãy thử lại.");
      setRemaining(current => current.filter(row => !processed.includes(row.evalId)));
      const feedback = firstFailure ? firstFailure.row.userName + " (" + firstFailure.row.userId + ") — " + message : message;
      setError(feedback);
      notify(processed.length ? "warning" : "error", processed.length
        ? "Đã xử lý " + processed.length + " hồ sơ. Các hồ sơ còn lại chưa hoàn tất. " + feedback
        : feedback);
    } finally {
      if (processed.length) onProcessed(processed);
      submitting.current = false;
      setBusy(false);
      if (complete) close();
    }
  }

  return (
    <dialog ref={dialog} className="summary-detail__dialog" aria-labelledby="summary-review-title"
      onCancel={event => { event.preventDefault(); close(); }}
      onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <form onSubmit={submit} aria-busy={busy}>
        <header className="summary-detail__dialogHeader">
          <span className="summary-detail__dialogIcon" data-reject={!approving}>
            {approving ? <PaperPlaneIcon aria-hidden="true" /> : <ResetIcon aria-hidden="true" />}
          </span>
          <div>
            <h2 id="summary-review-title">{approving ? "Gửi duyệt hồ sơ" : "Trả về hồ sơ"}</h2>
            <p>{approving ? "Chọn người nhận và xác nhận bước xử lý tiếp theo." : "Ghi rõ nội dung cần bổ sung hoặc điều chỉnh."}</p>
          </div>
          <button type="button" className="summary-detail__iconButton" aria-label="Đóng hộp thoại" disabled={busy} onClick={close}>
            <Cross2Icon aria-hidden="true" />
          </button>
        </header>
        <div className="summary-detail__dialogBody">
          <div className="summary-detail__reviewContext">
            <PersonIcon aria-hidden="true" />
            <div>
              <strong>{remaining.length === 1 ? remaining[0].userName : remaining.length + " bản đánh giá"}</strong>
              <span>{remaining.length === 1 ? remaining[0].userId + " · " + remaining[0].companyCode : target.all ? "Toàn bộ kết quả theo bộ lọc hiện tại" : "Các hồ sơ đã chọn, gồm các trang khác"}</span>
            </div>
          </div>
          {approving ? <div className="summary-detail__field">
            <label htmlFor="summary-review-managers">Quản lý cấp cao nhận duyệt <span>Không bắt buộc</span></label>
            <SearchableSelect id="summary-review-managers" label="Người duyệt" multiple value={managerIds}
              options={managers.map(manager => ({ id: String(manager.id), name: manager.userName + (manager.departmentName ? " · " + manager.departmentName : "") }))}
              placeholder="Chọn người duyệt tiếp theo…" disabled={busy || loading} loading={loading} onChange={setManagerIds} />
            <p className="summary-detail__hint">{loading ? "Đang tải người duyệt…" : "Có thể chọn nhiều người duyệt."}</p>
            {lookupError && <p className="summary-detail__error" role="alert">{lookupError} <button type="button" onClick={() => setRevision(value => value + 1)} disabled={busy}>Thử lại</button></p>}
          </div> : <div className="summary-detail__field">
            <label htmlFor="summary-return-reason">Lý do trả về <span aria-hidden="true">*</span></label>
            <textarea id="summary-return-reason" value={comment} onChange={event => setComment(event.target.value)} rows={4}
              placeholder="Nội dung cần bổ sung hoặc điều chỉnh…" required disabled={busy} autoFocus aria-describedby={error ? "summary-review-error" : undefined} />
          </div>}
          {error && <p id="summary-review-error" className="summary-detail__error" role="alert">{error}</p>}
        </div>
        <footer className="summary-detail__dialogFooter">
          <button type="button" className="summary-detail__button" onClick={close} disabled={busy}>Hủy</button>
          <button type="submit" className="summary-detail__button summary-detail__primary" data-reject={!approving}
            disabled={busy || loading || (!approving && !comment.trim())}>
            {busy ? <ReloadIcon className="summary-detail__spin" aria-hidden="true" /> : <CheckIcon aria-hidden="true" />}
            {busy ? "Đang xử lý…" : approving ? "Xác nhận gửi duyệt" : "Xác nhận trả về"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
