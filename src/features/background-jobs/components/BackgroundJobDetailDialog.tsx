"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  CodeIcon,
  CopyIcon,
  CounterClockwiseClockIcon,
  Cross2Icon,
  EnvelopeClosedIcon,
  ExclamationTriangleIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { notify } from "@/components/ui/Toaster";
import { backgroundJobsApi } from "../services/backgroundJobsApi";
import {
  attemptStatusInfo,
  formatAttemptDuration,
  formatJobDateTime,
  jobStatusInfo,
  jobTypeLabel,
  parseJobPayload,
  prepareEmailPreviewHtml,
  type BackgroundJobAttempt,
  type BackgroundJobDetail,
  type BackgroundJobItem,
} from "../types";

interface Props {
  job: BackgroundJobItem | null;
  onClose: () => void;
}

export function BackgroundJobDetailDialog({ job, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [detail, setDetail] = useState<BackgroundJobDetail | null>(null);
  const [attempts, setAttempts] = useState<BackgroundJobAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [payloadOpen, setPayloadOpen] = useState(true);
  const [payloadMode, setPayloadMode] = useState<"preview" | "json">("preview");
  const [copied, setCopied] = useState(false);
  const [frameHeight, setFrameHeight] = useState(360);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (job) {
      if (!el.open) el.showModal();
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
        if (el.open) el.close();
      };
    }
    if (el.open) el.close();
  }, [job]);

  useEffect(() => {
    if (!job) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setDetail(null);
    setAttempts([]);
    setPayloadOpen(true);
    setPayloadMode("preview");
    setCopied(false);
    setFrameHeight(360);

    Promise.all([
      backgroundJobsApi.getDetail(job.id, controller.signal),
      backgroundJobsApi.getAttempts(job.id, controller.signal),
    ])
      .then(([nextDetail, nextAttempts]) => {
        if (controller.signal.aborted) return;
        setDetail(nextDetail);
        setAttempts(Array.isArray(nextAttempts) ? nextAttempts : []);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        const msg =
          cause instanceof Error && cause.message === "UNAUTHORIZED"
            ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
            : "Không tải được chi tiết Background Job. Vui lòng thử lại.";
        setError(msg);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [job, revision]);

  const current = detail ?? job;
  const parsedPayload = useMemo(() => parseJobPayload(detail?.payload), [detail?.payload]);
  const emailPreviewDoc = useMemo(
    () => (parsedPayload.email?.body ? prepareEmailPreviewHtml(parsedPayload.email.body) : ""),
    [parsedPayload.email?.body],
  );
  const hasEmailPreview = Boolean(parsedPayload.email?.body || parsedPayload.email?.toEmail || parsedPayload.email?.subject);
  const effectiveMode = hasEmailPreview ? payloadMode : "json";

  function syncEmailFrameHeight(iframe: HTMLIFrameElement | null) {
    if (!iframe) return;
    try {
      const body = iframe.contentDocument?.body;
      if (!body) return;
      const nextHeight = Math.ceil(body.getBoundingClientRect().height);
      if (nextHeight > 0) setFrameHeight(nextHeight);
    } catch {
      // Keep default height if measurement is blocked
    }
  }

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || effectiveMode !== "preview" || !emailPreviewDoc) return;
    const observer = new ResizeObserver(() => syncEmailFrameHeight(iframe));
    observer.observe(iframe);
    return () => observer.disconnect();
  }, [effectiveMode, emailPreviewDoc]);

  async function handleCopyPayload() {
    const text = parsedPayload.prettyJson || detail?.payload || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      notify("success", "Đã sao chép nội dung payload.", "bgjob-copy");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      notify("error", "Không thể sao chép vào clipboard.", "bgjob-copy");
    }
  }

  if (!job || !current) return <dialog ref={dialogRef} className="bg-jobs__dialog" />;

  const statusInfo = jobStatusInfo(current.status);

  return (
    <dialog
      ref={dialogRef}
      className="bg-jobs__dialog"
      aria-labelledby="bg-job-detail-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="bg-jobs__dialogPanel">
        <header className="bg-jobs__dialogHeader">
          <div className="bg-jobs__dialogHeading">
            <div className="bg-jobs__dialogTitleRow">
              <h2 id="bg-job-detail-title">Background Job #{current.id}</h2>
              <span className="bg-jobs__badge" data-tone={statusInfo.tone}>
                <i aria-hidden="true" />
                {statusInfo.label}
              </span>
            </div>
            <p className="bg-jobs__dialogSubtitle">
              {current.jobName} · <span>{jobTypeLabel(current.jobType)}</span>
            </p>
          </div>

          <button
            type="button"
            className="bg-jobs__iconBtn"
            aria-label="Đóng chi tiết job"
            onClick={onClose}
          >
            <Cross2Icon aria-hidden="true" />
          </button>
        </header>

        <div className="bg-jobs__dialogBody">
          <dl className="bg-jobs__metaGrid">
            <div>
              <dt>Tên Job</dt>
              <dd>{current.jobName || "—"}</dd>
            </div>
            <div>
              <dt>Loại Job</dt>
              <dd className="bg-jobs__mono">
                {jobTypeLabel(current.jobType)}
                {jobTypeLabel(current.jobType) !== current.jobType && (
                  <span className="bg-jobs__codeHint">{current.jobType}</span>
                )}
              </dd>
            </div>
            <div>
              <dt>Trạng thái</dt>
              <dd>
                <span className="bg-jobs__badge" data-tone={statusInfo.tone}>
                  <i aria-hidden="true" />
                  {statusInfo.label}
                </span>
              </dd>
            </div>
            <div>
              <dt>Số lần thử</dt>
              <dd className="bg-jobs__nums">
                {current.retryCount} / {current.maxRetryCount}
              </dd>
            </div>
            <div>
              <dt>Thời gian chạy</dt>
              <dd className="bg-jobs__nums">{formatJobDateTime(current.scheduledAt)}</dd>
            </div>
            <div>
              <dt>Thời gian tạo</dt>
              <dd className="bg-jobs__nums">{formatJobDateTime(current.createdAt)}</dd>
            </div>
            <div>
              <dt>Lần chạy lại tiếp theo</dt>
              <dd className="bg-jobs__nums">{formatJobDateTime(current.nextRetryAt)}</dd>
            </div>
            <div>
              <dt>Thời gian khóa đến</dt>
              <dd className="bg-jobs__nums">{formatJobDateTime(current.lockedUntil)}</dd>
            </div>
          </dl>

          <section className="bg-jobs__detailSection">
            <h3 className="bg-jobs__sectionTitle">Lỗi gần nhất</h3>
            {current.lastError ? (
              <div className="bg-jobs__errorBox" role="alert">
                <ExclamationTriangleIcon aria-hidden="true" />
                <pre>{current.lastError}</pre>
              </div>
            ) : (
              <p className="bg-jobs__noError">Không có lỗi.</p>
            )}
          </section>

          {error && (
            <div className="bg-jobs__inlineError" role="alert">
              <ExclamationTriangleIcon aria-hidden="true" />
              <span>{error}</span>
              <button type="button" onClick={() => setRevision((v) => v + 1)}>
                <ReloadIcon aria-hidden="true" />
                Thử lại
              </button>
            </div>
          )}

          <section className="bg-jobs__detailSection bg-jobs__payloadCard">
            <div className="bg-jobs__payloadBar">
              <button
                type="button"
                className="bg-jobs__payloadToggle"
                aria-expanded={payloadOpen}
                onClick={() => setPayloadOpen((open) => !open)}
              >
                <ChevronDownIcon data-open={payloadOpen ? "true" : undefined} aria-hidden="true" />
                <span>Nội dung xử lý</span>
              </button>

              {payloadOpen && !loading && detail?.payload && (
                <div className="bg-jobs__payloadActions">
                  {hasEmailPreview && (
                    <div className="bg-jobs__segmented" role="tablist" aria-label="Chế độ xem nội dung">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={effectiveMode === "preview"}
                        data-active={effectiveMode === "preview" ? "true" : undefined}
                        onClick={() => setPayloadMode("preview")}
                      >
                        <EnvelopeClosedIcon aria-hidden="true" />
                        <span>Email</span>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={effectiveMode === "json"}
                        data-active={effectiveMode === "json" ? "true" : undefined}
                        onClick={() => setPayloadMode("json")}
                      >
                        <CodeIcon aria-hidden="true" />
                        <span>JSON</span>
                      </button>
                    </div>
                  )}

                  <button type="button" className="bg-jobs__copyBtn" onClick={handleCopyPayload}>
                    {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
                    <span>{copied ? "Đã chép" : "Sao chép"}</span>
                  </button>
                </div>
              )}
            </div>

            {payloadOpen && (
              <div className="bg-jobs__payloadContent">
                {loading ? (
                  <div className="bg-jobs__loadingRow" role="status" aria-busy="true">
                    <span className="bg-jobs__spinner" aria-hidden="true" />
                    <span>Đang tải nội dung xử lý…</span>
                  </div>
                ) : !detail?.payload ? (
                  <p className="bg-jobs__mutedNote">Job này không có dữ liệu payload.</p>
                ) : effectiveMode === "preview" && parsedPayload.email ? (
                  <div className="bg-jobs__emailPreview">
                    <div className="bg-jobs__emailMeta">
                      <div>
                        <span>Người nhận</span>
                        <strong>{parsedPayload.email.toEmail || "—"}</strong>
                      </div>
                      <div>
                        <span>Tiêu đề</span>
                        <strong>{parsedPayload.email.subject || "—"}</strong>
                      </div>
                    </div>
                    {emailPreviewDoc && (
                      <iframe
                        ref={iframeRef}
                        className="bg-jobs__emailFrame"
                        style={{ height: `${frameHeight}px` }}
                        title={`Xem trước email của Job #${current.id}`}
                        srcDoc={emailPreviewDoc}
                        sandbox="allow-same-origin"
                        scrolling="no"
                        onLoad={(event) => syncEmailFrameHeight(event.currentTarget)}
                      />
                    )}
                  </div>
                ) : (
                  <pre className="bg-jobs__codeBlock">{parsedPayload.prettyJson}</pre>
                )}
              </div>
            )}
          </section>

          <section className="bg-jobs__detailSection">
            <div className="bg-jobs__sectionHead">
              <h3 className="bg-jobs__sectionTitle">
                <CounterClockwiseClockIcon aria-hidden="true" />
                <span>Lịch sử thực thi</span>
              </h3>
              {!loading && (
                <span className="bg-jobs__countPill">{attempts.length} lần</span>
              )}
            </div>

            {loading ? (
              <div className="bg-jobs__loadingRow" role="status" aria-busy="true">
                <span className="bg-jobs__spinner" aria-hidden="true" />
                <span>Đang tải lịch sử thực thi…</span>
              </div>
            ) : attempts.length === 0 ? (
              <p className="bg-jobs__mutedNote">Chưa có lịch sử thực thi cho job này.</p>
            ) : (
              <div className="bg-jobs__attemptsWrap">
                <table className="bg-jobs__attemptsTable">
                  <thead>
                    <tr>
                      <th>Lần thực thi</th>
                      <th>Trạng thái</th>
                      <th>Bắt đầu lúc</th>
                      <th>Kết thúc lúc</th>
                      <th>Thời lượng</th>
                      <th>Lỗi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((attempt) => {
                      const info = attemptStatusInfo(attempt.status, attempt.errorMessage);
                      return (
                        <tr key={attempt.id}>
                          <td className="bg-jobs__nums">#{attempt.attemptNumber}</td>
                          <td>
                            <span className="bg-jobs__badge" data-tone={info.tone}>
                              <i aria-hidden="true" />
                              {info.label}
                            </span>
                          </td>
                          <td className="bg-jobs__nums">{formatJobDateTime(attempt.startedAt)}</td>
                          <td className="bg-jobs__nums">{formatJobDateTime(attempt.finishedAt)}</td>
                          <td className="bg-jobs__nums">
                            {formatAttemptDuration(attempt.startedAt, attempt.finishedAt)}
                          </td>
                          <td
                            className="bg-jobs__attemptError"
                            data-has-error={attempt.errorMessage ? "true" : undefined}
                          >
                            {attempt.errorMessage || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <footer className="bg-jobs__dialogFooter">
          <button type="button" className="bg-jobs__primaryBtn" onClick={onClose}>
            Đóng
          </button>
        </footer>
      </div>
    </dialog>
  );
}
