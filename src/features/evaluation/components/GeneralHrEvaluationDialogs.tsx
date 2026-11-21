"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Text } from "@astryxdesign/core/Text";
import {
  ArrowRight,
  ArrowRightLeft,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  History,
  ListChecks,
  RefreshCw,
  User,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import {
  AppButton,
  AppForm,
  AppTextArea,
  DetailDialog,
  EvaluationStatusBadge,
  FormDialog,
  InlineErrorBanner,
  LoadingOverlay,
  UserIdentityCell,
  useAppToast,
} from "@/components/ds";
import {
  CHANGE_STATUS_EXCLUDED_IDS,
  resolveEvaluationStatus,
} from "@/design-system/registries";
import { formatDateTime, getInitials } from "@/lib/format/formatters";
import { getErrorMessage, isAbortError } from "@/lib/http/request";
import { generalHrEvaluationApi } from "../services/generalHrEvaluationApi";
import type {
  ApprovalHistoryEntry,
  EvaluationApprover,
  GeneralHrEvaluationDto,
  TemplateStatusOption,
} from "../types";

function splitTimeParts(raw?: string | null): { time: string; date: string } {
  const formatted = formatDateTime(raw);
  if (!formatted || formatted === "—") return { time: "—", date: "" };
  const parts = formatted.split(" ");
  if (parts.length >= 2) {
    return { time: parts[1], date: parts[0] };
  }
  return { time: formatted, date: "" };
}

function resolveHistoryStepInfo(entry: ApprovalHistoryEntry): {
  tone: "waiting" | "success" | "danger" | "info";
  label: string;
} {
  const rawStatus = entry.status ?? entry.statusValue ?? "";
  if (rawStatus === "Pending") {
    return { tone: "waiting", label: "Đang chờ phê duyệt" };
  }
  if (rawStatus === "Rejected") {
    return { tone: "danger", label: "Đã từ chối" };
  }
  if (rawStatus === "Approved") {
    return { tone: "success", label: "Đã phê duyệt" };
  }
  if (rawStatus === "Submitted") {
    return { tone: "info", label: "Đã nộp đánh giá" };
  }
  const spec = resolveEvaluationStatus(rawStatus);
  const tone =
    spec.group === "rejected"
      ? "danger"
      : spec.group === "done"
        ? "success"
        : spec.isReviewingStep
          ? "waiting"
          : "info";
  return {
    tone,
    label:
      entry.statusValue &&
      !["Submitted", "Pending", "Approved", "Rejected"].includes(entry.statusValue)
        ? entry.statusValue
        : spec.label,
  };
}

export function EvaluationHistoryDialog({
  evaluation,
  onClose,
  onOpenApprovers,
}: {
  evaluation: GeneralHrEvaluationDto | null;
  onClose: () => void;
  onOpenApprovers?: (row: GeneralHrEvaluationDto) => void;
}) {
  const [entries, setEntries] = useState<ApprovalHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!evaluation) return;
    const ctrl = new AbortController();
    setIsLoading(true);
    setError(null);
    generalHrEvaluationApi
      .getApprovalHistory(evaluation.id, ctrl.signal)
      .then((list) => {
        if (!ctrl.signal.aborted) setEntries(list);
      })
      .catch((err) => {
        if (!isAbortError(err) && !ctrl.signal.aborted) {
          setError(getErrorMessage(err, "Không thể tải quá trình phê duyệt."));
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setIsLoading(false);
      });
    return () => ctrl.abort();
  }, [evaluation]);

  const reversedEntries = useMemo(() => [...entries].reverse(), [entries]);

  const effectiveSubmitDate = useMemo(() => {
    if (!evaluation) return "—";
    const submitAt =
      evaluation.submitDate ??
      entries.find((item) => item.status === "Submitted")?.createdAt ??
      null;
    return submitAt ? formatDateTime(submitAt) : "Chưa nộp";
  }, [entries, evaluation]);

  return (
    <DetailDialog
      isOpen={Boolean(evaluation)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      width={760}
      title={
        <div className="flex items-center gap-2.5">
          <span className="ds-section-icon" data-tone="blue" aria-hidden="true">
            <ListChecks className="h-4 w-4" />
          </span>
          <span>Quá trình phê duyệt</span>
        </div>
      }
      subtitle={evaluation ? `Toàn bộ dấu mốc của hồ sơ #${evaluation.id}` : undefined}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div>
            {evaluation && onOpenApprovers ? (
              <AppButton
                label="Người đang duyệt"
                variant="ghost"
                size="sm"
                icon={<UserCheck className="h-4 w-4" />}
                endContent={<ArrowRight className="h-3.5 w-3.5" />}
                onClick={() => onOpenApprovers(evaluation)}
              />
            ) : null}
          </div>
          <AppButton label="Đóng" variant="primary" onClick={onClose} />
        </div>
      }
    >
      {evaluation ? (
        <div className="flex flex-col gap-5">
          {/* Executive Navy Hero Record Banner */}
          <div className="ds-dialog-hero">
            <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="ds-dialog-hero-avatar" aria-hidden="true">
                  {getInitials(evaluation.name || "NV")}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-base font-bold">
                    {evaluation.name || `Hồ sơ #${evaluation.id}`}
                  </div>
                  <div className="ds-dialog-hero-muted truncate text-xs tabular-nums">
                    {[evaluation.systemCode, evaluation.companyCode].filter(Boolean).join(" · ") ||
                      "—"}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="ds-dialog-hero-muted text-[11px] font-medium">
                  Trạng thái hiện tại
                </span>
                <EvaluationStatusBadge status={evaluation.status} />
              </div>
            </div>

            <dl className="ds-dialog-hero-divider relative z-10 mt-4 grid grid-cols-1 gap-3 border-t pt-3.5 sm:grid-cols-3">
              <div className="min-w-0">
                <dt className="ds-dialog-hero-muted text-[11px] font-medium">Kỳ đánh giá</dt>
                <dd className="mt-0.5 truncate text-xs font-bold">
                  {evaluation.period || "Chưa có kỳ đánh giá"}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="ds-dialog-hero-muted text-[11px] font-medium">Phòng ban</dt>
                <dd className="mt-0.5 line-clamp-2 text-xs font-bold">
                  {evaluation.departmentName || "Chưa có phòng ban"}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="ds-dialog-hero-muted text-[11px] font-medium">Ngày nộp</dt>
                <dd className="mt-0.5 text-xs font-bold tabular-nums">{effectiveSubmitDate}</dd>
              </div>
            </dl>
          </div>

          {/* Chronological Audit Log */}
          <section className="flex flex-col gap-3.5" aria-label="Nhật ký xử lý">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 text-sm font-bold text-primary">
                <History className="h-4 w-4 text-accent" aria-hidden="true" />
                <span>Nhật ký xử lý</span>
              </div>
              {!isLoading && !error ? (
                <span className="text-xs font-medium text-secondary">
                  {reversedEntries.length} dấu mốc · Mới nhất trước
                </span>
              ) : null}
            </div>

            {isLoading ? (
              <LoadingOverlay label="Đang tải lịch sử phê duyệt..." />
            ) : error ? (
              <InlineErrorBanner message={error} />
            ) : reversedEntries.length === 0 ? (
              <div className="ds-empty-dropzone">
                <History className="h-5 w-5 text-secondary opacity-70" aria-hidden="true" />
                <div className="text-sm font-semibold text-primary">Chưa có lịch sử duyệt</div>
                <p className="max-w-xs text-xs text-secondary">
                  Các lần gửi, duyệt hoặc từ chối sẽ được ghi nhận tại đây.
                </p>
              </div>
            ) : (
              <ol className="ds-timeline-rich max-h-[360px] overflow-y-auto pr-1">
                {reversedEntries.map((entry, idx) => {
                  const { time, date } = splitTimeParts(entry.createdAt);
                  const step = resolveHistoryStepInfo(entry);
                  const isLatest = idx === 0;
                  return (
                    <li key={entry.approvalId ?? idx} className="ds-timeline-row">
                      <time className="ds-timeline-time" dateTime={entry.createdAt ?? undefined}>
                        <span className="font-semibold text-primary">{time}</span>
                        {date ? <span>{date}</span> : null}
                      </time>

                      <span className="ds-timeline-node" data-tone={step.tone} aria-hidden="true">
                        {step.tone === "danger" ? (
                          <X className="h-3.5 w-3.5" />
                        ) : step.tone === "waiting" ? (
                          <Clock className="h-3.5 w-3.5" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </span>

                      <div className="ds-timeline-card" data-latest={isLatest ? "true" : "false"}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="ds-identity-tile h-8 w-8" aria-hidden="true">
                              <User className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-primary">
                                {entry.approverName || "Chưa xác định người xử lý"}
                              </div>
                              <div className="truncate text-xs tabular-nums text-secondary">
                                {entry.approverUserId || "Hệ thống"}
                              </div>
                            </div>
                          </div>
                          {isLatest ? (
                            <span className="ds-timeline-latestTag">Mới nhất</span>
                          ) : null}
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          {entry.approvalLevel ? (
                            <span className="ds-timeline-pill">{entry.approvalLevel}</span>
                          ) : null}
                          <span className="ds-timeline-pill" data-tone={step.tone}>
                            {step.label}
                          </span>
                        </div>

                        {entry.comment ? (
                          <blockquote className="ds-timeline-quote">{entry.comment}</blockquote>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      ) : null}
    </DetailDialog>
  );
}

export function EvaluationApproversDialog({
  evaluation,
  onClose,
  onOpenHistory,
}: {
  evaluation: GeneralHrEvaluationDto | null;
  onClose: () => void;
  onOpenHistory?: (row: GeneralHrEvaluationDto) => void;
}) {
  const [approvers, setApprovers] = useState<EvaluationApprover[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!evaluation) return;
    const ctrl = new AbortController();
    setIsLoading(true);
    setError(null);
    generalHrEvaluationApi
      .getApprovers(evaluation.id, ctrl.signal)
      .then((list) => {
        if (!ctrl.signal.aborted) setApprovers(list);
      })
      .catch((err) => {
        if (!isAbortError(err) && !ctrl.signal.aborted) {
          setError(getErrorMessage(err, "Không thể tải danh sách người đang duyệt."));
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setIsLoading(false);
      });
    return () => ctrl.abort();
  }, [evaluation]);

  return (
    <DetailDialog
      isOpen={Boolean(evaluation)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      width={620}
      title={
        <div className="flex items-center gap-2.5">
          <span className="ds-section-icon" data-tone="purple" aria-hidden="true">
            <UserCheck className="h-4 w-4" />
          </span>
          <span>Người đang duyệt</span>
        </div>
      }
      subtitle="Thông tin người xử lý tại bước hiện tại."
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div>
            {evaluation && onOpenHistory ? (
              <AppButton
                label="Xem quá trình"
                variant="ghost"
                size="sm"
                icon={<History className="h-4 w-4" />}
                endContent={<ArrowRight className="h-3.5 w-3.5" />}
                onClick={() => onOpenHistory(evaluation)}
              />
            ) : null}
          </div>
          <AppButton label="Đóng" variant="primary" onClick={onClose} />
        </div>
      }
    >
      {evaluation ? (
        <div className="flex flex-col gap-4">
          {/* Compact Navy Record Context */}
          <div className="ds-dialog-hero">
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="ds-dialog-hero-muted inline-flex items-center gap-1.5 text-[11px] font-semibold">
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  Hồ sơ #{evaluation.id}
                </span>
                <div className="mt-0.5 truncate text-base font-bold">
                  {evaluation.name || "—"}
                </div>
                <div className="ds-dialog-hero-muted truncate text-xs">
                  {evaluation.departmentName || evaluation.companyCode || "Chưa có đơn vị"}
                </div>
              </div>
              <EvaluationStatusBadge status={evaluation.status} />
            </div>
          </div>

          {isLoading ? (
            <LoadingOverlay label="Đang tải danh sách người duyệt..." />
          ) : error ? (
            <InlineErrorBanner message={error} />
          ) : approvers.length === 0 ? (
            <div className="ds-empty-dropzone">
              <UserCheck className="h-5 w-5 text-secondary opacity-70" aria-hidden="true" />
              <div className="text-sm font-semibold text-primary">Chưa có người đang duyệt</div>
              <p className="max-w-xs text-xs text-secondary">
                Hồ sơ hiện chưa có người xử lý tại bước này. Bạn có thể xem lại quá trình phê duyệt.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-primary">Người xử lý</span>
                <span className="ds-count-pill">{approvers.length} người</span>
              </div>
              <div className="flex max-h-[340px] flex-col gap-2.5 overflow-y-auto pr-0.5">
                {approvers.map((item) => (
                  <div key={item.id} className="ds-form-section flex flex-col gap-2.5 p-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <UserIdentityCell
                        name={item.userName}
                        code={item.systemCode || undefined}
                        department={
                          item.status ? resolveEvaluationStatus(item.status).label : undefined
                        }
                      />
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className="ds-timeline-pill inline-flex items-center gap-1"
                          data-tone={item.isApprove ? "success" : "waiting"}
                        >
                          {item.isApprove ? (
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {item.isApprove ? "Đã duyệt" : "Chưa duyệt"}
                        </span>
                        {item.approvalDate ? (
                          <span className="text-xs tabular-nums text-secondary">
                            {formatDateTime(item.approvalDate)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {item.message ? (
                      <blockquote className="ds-timeline-quote mt-0">{item.message}</blockquote>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </DetailDialog>
  );
}

export function ChangeEvaluationStatusDialog({
  evaluation,
  onClose,
  onSuccess,
}: {
  evaluation: GeneralHrEvaluationDto | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const showToast = useAppToast();
  const [statuses, setStatuses] = useState<TemplateStatusOption[]>([]);
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [targetStatus, setTargetStatus] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<{ status?: string; reason?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!evaluation) return;
    setTargetStatus("");
    setReason("");
    setFormError({});
    setLoadError(null);

    if (!evaluation.templateId) {
      setStatuses([]);
      setLoadError("Bản đánh giá này chưa gắn biểu mẫu để tra cứu trạng thái.");
      return;
    }

    const ctrl = new AbortController();
    setIsLoadingStatuses(true);
    generalHrEvaluationApi
      .getStatuses(evaluation.templateId, ctrl.signal)
      .then((list) => {
        if (ctrl.signal.aborted) return;
        // Legacy business rule: exclude Drafted (1) and SentHR (9)
        const filtered = list.filter((opt) => !CHANGE_STATUS_EXCLUDED_IDS.has(Number(opt.status)));
        setStatuses(filtered);
      })
      .catch((err) => {
        if (!isAbortError(err) && !ctrl.signal.aborted) {
          setLoadError(getErrorMessage(err, "Không thể tải danh sách trạng thái."));
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setIsLoadingStatuses(false);
      });
    return () => ctrl.abort();
  }, [evaluation]);

  const currentSpec = useMemo(
    () => (evaluation ? resolveEvaluationStatus(evaluation.status) : null),
    [evaluation],
  );

  const selectedOption = useMemo(() => {
    if (!targetStatus) return null;
    const found = statuses.find((s) => String(s.status) === targetStatus);
    if (!found) return null;
    const spec = resolveEvaluationStatus(found.stepStatus || found.status);
    return {
      raw: found,
      spec,
      label: found.name?.trim() || spec.label,
    };
  }, [statuses, targetStatus]);

  const handleSubmit = async () => {
    if (!evaluation) return;
    const nextErrors: { status?: string; reason?: string } = {};
    if (!targetStatus) nextErrors.status = "Vui lòng chọn trạng thái đích.";
    if (!reason.trim()) nextErrors.reason = "Vui lòng nhập lý do chuyển trạng thái.";
    if (Object.keys(nextErrors).length > 0) {
      setFormError(nextErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await generalHrEvaluationApi.changeStatus({
        evalId: evaluation.id,
        status: Number(targetStatus),
        reason: reason.trim(),
      });
      showToast("success", "Đã chuyển trạng thái bản đánh giá thành công.");
      onSuccess();
      onClose();
    } catch (err) {
      showToast("error", getErrorMessage(err, "Không thể chuyển trạng thái bản đánh giá."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      isOpen={Boolean(evaluation)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      width={880}
      title={
        <div className="flex items-center gap-2.5">
          <span className="ds-section-icon" data-tone="orange" aria-hidden="true">
            <ArrowRightLeft className="h-4 w-4" />
          </span>
          <span>Chuyển trạng thái</span>
        </div>
      }
      subtitle={
        evaluation
          ? `Hồ sơ #${evaluation.id} · Chọn bước xử lý tiếp theo và nhập lý do điều chỉnh.`
          : undefined
      }
      cancelLabel="Hủy thay đổi"
      submitLabel="Xác nhận chuyển"
      isDirty={Boolean(targetStatus || reason.trim())}
      isSubmitting={isSubmitting}
      submitDisabled={isLoadingStatuses || Boolean(loadError) || !targetStatus || !reason.trim()}
      onSubmit={handleSubmit}
    >
      {evaluation ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[268px_minmax(0,1fr)]">
          {/* LEFT EXECUTIVE CONTEXT COLUMN */}
          <aside className="ds-dialog-hero flex flex-col justify-between gap-4">
            <div className="relative z-10 flex flex-col gap-4">
              <span className="ds-dialog-hero-muted inline-flex items-center gap-1.5 text-[11px] font-semibold">
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                Hồ sơ #{evaluation.id}
              </span>

              <div className="flex items-center gap-3 min-w-0">
                <span className="ds-dialog-hero-avatar" aria-hidden="true">
                  {getInitials(evaluation.name || "NV")}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{evaluation.name || "—"}</div>
                  <div className="ds-dialog-hero-muted truncate text-xs tabular-nums">
                    {[evaluation.systemCode, evaluation.companyCode].filter(Boolean).join(" · ") ||
                      "—"}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="ds-dialog-hero-muted text-[11px] font-medium">
                  Trạng thái hiện tại
                </span>
                <EvaluationStatusBadge status={evaluation.status} />
              </div>

              <dl className="ds-dialog-hero-divider flex flex-col gap-2.5 border-t pt-3">
                <div>
                  <dt className="ds-dialog-hero-muted text-[11px]">Kỳ đánh giá</dt>
                  <dd className="mt-0.5 text-xs font-bold">
                    {evaluation.period || "Chưa có kỳ đánh giá"}
                  </dd>
                </div>
                <div>
                  <dt className="ds-dialog-hero-muted text-[11px]">Phòng ban</dt>
                  <dd className="mt-0.5 text-xs font-bold">
                    {evaluation.departmentName || "Chưa có phòng ban"}
                  </dd>
                </div>
              </dl>
            </div>

            <div
              className="ds-dialog-hero-dest relative z-10 flex flex-col gap-1"
              data-selected={selectedOption ? "true" : "false"}
            >
              <span className="ds-dialog-hero-muted inline-flex items-center gap-1 text-[11px] font-medium">
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                Chuyển đến
              </span>
              <span className="text-xs font-bold">
                {selectedOption ? selectedOption.label : "Chọn trạng thái mới"}
              </span>
            </div>
          </aside>

          {/* RIGHT INTERACTIVE TRANSITION CARDS + REASON */}
          <div className="flex flex-col gap-4 min-w-0">
            {isLoadingStatuses ? (
              <LoadingOverlay label="Đang tải danh sách trạng thái..." />
            ) : loadError ? (
              <InlineErrorBanner message={loadError} />
            ) : (
              <AppForm>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-primary">
                      Chuyển hồ sơ đến <span className="text-error">*</span>
                    </span>
                    <span className="ds-count-pill">{statuses.length} lựa chọn</span>
                  </div>

                  {statuses.length === 0 ? (
                    <div className="ds-empty-dropzone min-h-[120px]">
                      <RefreshCw className="h-5 w-5 text-secondary opacity-70" aria-hidden="true" />
                      <div className="text-xs font-semibold text-primary">
                        Chưa có bước chuyển khả dụng
                      </div>
                      <Text type="supporting">
                        Mẫu đánh giá này chưa có trạng thái có thể chuyển.
                      </Text>
                    </div>
                  ) : (
                    <div
                      className="grid max-h-[250px] grid-cols-1 gap-2 overflow-y-auto pr-0.5 sm:grid-cols-2"
                      role="radiogroup"
                      aria-label="Chọn trạng thái đích"
                    >
                      {statuses.map((opt) => {
                        const valueStr = String(opt.status);
                        const spec = resolveEvaluationStatus(opt.stepStatus || opt.status);
                        const isCurrent = Boolean(currentSpec && spec.key === currentSpec.key);
                        const isSelected = targetStatus === valueStr;
                        const tone =
                          spec.group === "rejected"
                            ? "danger"
                            : spec.group === "done"
                              ? "success"
                              : "info";
                        const hint = isCurrent
                          ? "Trạng thái hiện tại"
                          : tone === "danger"
                            ? "Trả lại hồ sơ để xử lý"
                            : tone === "success"
                              ? "Ghi nhận bước hoàn thành"
                              : "Chuyển sang bước xử lý này";
                        return (
                          <label
                            key={valueStr}
                            className="ds-status-option"
                            data-selected={isSelected ? "true" : "false"}
                            data-current={isCurrent ? "true" : "false"}
                            data-tone={tone}
                          >
                            <input
                              type="radio"
                              name="hr-target-status"
                              value={valueStr}
                              checked={isSelected}
                              disabled={isCurrent || isSubmitting}
                              onChange={() => {
                                setTargetStatus(valueStr);
                                setFormError((e) => ({ ...e, status: undefined }));
                              }}
                              className="sr-only"
                            />
                            <span
                              className="ds-section-icon h-7 w-7"
                              data-tone={
                                tone === "danger"
                                  ? "orange"
                                  : tone === "success"
                                    ? "cyan"
                                    : "blue"
                              }
                              aria-hidden="true"
                            >
                              {tone === "danger" ? (
                                <XCircle className="h-3.5 w-3.5" />
                              ) : tone === "success" ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                              )}
                            </span>
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                              <EvaluationStatusBadge
                                status={opt.stepStatus || opt.status}
                                displayLabel={opt.name?.trim() || spec.label}
                                compact
                              />
                              <span className="text-[11.5px] text-secondary">{hint}</span>
                            </div>
                            <span className="ds-status-radio" aria-hidden="true">
                              {isSelected ? <Check className="h-3 w-3" /> : null}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {formError.status ? (
                    <span className="text-xs font-medium text-error">{formError.status}</span>
                  ) : null}
                </div>

                {statuses.length > 0 ? (
                  <AppTextArea
                    label="Lý do thay đổi"
                    value={reason}
                    onChange={(val) => {
                      setReason(val);
                      setFormError((e) => ({ ...e, reason: undefined }));
                    }}
                    placeholder="Nhập rõ lý do điều chỉnh trạng thái..."
                    rows={3}
                    isRequired
                    error={formError.reason}
                  />
                ) : null}
              </AppForm>
            )}
          </div>
        </div>
      ) : null}
    </FormDialog>
  );
}
