"use client";

import React, { useEffect, useState } from "react";
import {
  AppForm,
  AppMultiSelect,
  AppTextArea,
  FormDialog,
  InlineErrorBanner,
  useAppToast,
} from "@/components/ds";
import { userOrganizationApi } from "@/features/user/services/userOrganizationApi";
import type { AvailableManager } from "@/features/user/types";
import { ApiRequestError, getErrorMessage, isAbortError } from "@/lib/http/request";
import { summaryApi } from "../services/summaryApi";
import type { ReviewCustomUser, SummaryDetail } from "../types";

export interface SummaryReviewTarget {
  kind: "approve" | "reject";
  rows: SummaryDetail[];
  all?: boolean;
}

export function SummaryReviewDialog({
  target,
  level,
  onClose,
  onProcessed,
}: {
  target: SummaryReviewTarget | null;
  level: number;
  onClose: () => void;
  onProcessed: (ids: number[]) => void;
}) {
  const showToast = useAppToast();
  const isApproving = target?.kind === "approve";

  const [remaining, setRemaining] = useState<SummaryDetail[]>([]);
  const [managers, setManagers] = useState<AvailableManager[]>([]);
  const [managerIds, setManagerIds] = useState<string[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [managerError, setManagerError] = useState<string | null>(null);
  const [managerReloadTick, setManagerReloadTick] = useState(0);

  const [comment, setComment] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!target) return;
    setRemaining(target.rows);
    setManagerIds([]);
    setComment("");
    setSubmitError(null);
    setManagerError(null);
  }, [target]);

  useEffect(() => {
    if (!target || target.kind !== "approve") return;
    const ctrl = new AbortController();
    setLoadingManagers(true);
    setManagerError(null);
    userOrganizationApi
      .getAvailableManagers(ctrl.signal)
      .then((list) => {
        if (!ctrl.signal.aborted) setManagers(list);
      })
      .catch((err) => {
        if (!isAbortError(err) && !ctrl.signal.aborted) {
          setManagerError(getErrorMessage(err, "Chưa tải được danh sách người duyệt."));
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoadingManagers(false);
      });
    return () => ctrl.abort();
  }, [managerReloadTick, target]);

  const handleSubmit = async () => {
    if (!target || isSubmitting || remaining.length === 0) return;
    if (isApproving && managerIds.length === 0) {
      setSubmitError("Vui lòng chọn ít nhất một người duyệt.");
      return;
    }
    if (!isApproving && !comment.trim()) {
      setSubmitError("Vui lòng nhập lý do trả về.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    const processed: number[] = [];
    let firstFailure: { row: SummaryDetail; cause: unknown } | null = null;
    let completed = false;

    try {
      if (isApproving) {
        const selectedManagers: ReviewCustomUser[] = managers
          .filter((m) => managerIds.includes(String(m.id)))
          .map((m) => ({
            Id: Number(m.id),
            UserId: m.userId ?? "",
            SystemCode: m.systemCode ?? m.employeeCode ?? "",
            JobTitle: m.jobTitle ?? m.jobPositionName ?? "",
            CompanyId: m.companyId ?? null,
            DepartmentId: m.departmentId ?? null,
          }));
        const ids = remaining.map((r) => r.evalId);
        await summaryApi.approve(ids, level, selectedManagers);
        processed.push(...ids);
      } else {
        // Sequential reject with partial-failure recovery
        for (const row of remaining) {
          try {
            await summaryApi.reject(row.evalId, level, comment.trim());
            processed.push(row.evalId);
          } catch (cause) {
            firstFailure ??= { row, cause };
            if (
              cause instanceof ApiRequestError &&
              (cause.status === 401 || cause.code === "UNAUTHORIZED")
            ) {
              break;
            }
          }
        }
        if (firstFailure) throw firstFailure.cause;
      }

      showToast(
        "success",
        `${isApproving ? "Đã gửi duyệt" : "Đã trả về"} ${processed.length} bản đánh giá.`,
      );
      completed = true;
    } catch (cause) {
      const baseMsg = getErrorMessage(cause, "Chưa hoàn tất thao tác. Hãy thử lại.");
      const detailMsg = firstFailure
        ? `${firstFailure.row.userName} (${firstFailure.row.userId}) — ${baseMsg}`
        : baseMsg;
      setRemaining((current) => current.filter((row) => !processed.includes(row.evalId)));
      setSubmitError(detailMsg);
      showToast(
        processed.length > 0 ? "warning" : "error",
        processed.length > 0
          ? `Đã xử lý ${processed.length} hồ sơ. Các hồ sơ còn lại chưa hoàn tất: ${detailMsg}`
          : detailMsg,
      );
    } finally {
      if (processed.length > 0) onProcessed(processed);
      setIsSubmitting(false);
      if (completed) onClose();
    }
  };

  return (
    <FormDialog
      isOpen={Boolean(target)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={isApproving ? "Gửi duyệt hồ sơ tổng hợp" : "Trả về hồ sơ tổng hợp"}
      subtitle={
        isApproving
          ? "Chọn quản lý cấp cao nhận duyệt và xác nhận chuyển bước."
          : "Ghi rõ nội dung cần điều chỉnh hoặc bổ sung."
      }
      isDirty={Boolean(comment.trim() || managerIds.length > 0)}
      isSubmitting={isSubmitting}
      submitLabel={isApproving ? "Xác nhận gửi duyệt" : "Xác nhận trả về"}
      submitDisabled={
        remaining.length === 0 ||
        (isApproving ? loadingManagers || managerIds.length === 0 : !comment.trim())
      }
      onSubmit={handleSubmit}
    >
      {target ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 text-sm">
            <div className="font-semibold text-primary">
              {remaining.length === 1
                ? remaining[0].userName
                : `${remaining.length} bản đánh giá`}
            </div>
            <div className="text-xs text-secondary">
              {remaining.length === 1
                ? `${remaining[0].userId} · ${remaining[0].companyCode}`
                : target.all
                  ? "Toàn bộ kết quả theo bộ lọc hiện tại"
                  : "Các hồ sơ đã chọn (bao gồm nhiều trang)"}
            </div>
          </div>

          {managerError ? (
            <InlineErrorBanner
              message={managerError}
              onRetry={() => setManagerReloadTick((t) => t + 1)}
            />
          ) : null}

          {submitError ? <InlineErrorBanner title="Thao tác chưa hoàn tất" message={submitError} /> : null}

          <AppForm>
            {isApproving ? (
              <AppMultiSelect
                label="Quản lý cấp cao nhận duyệt"
                value={managerIds}
                onChange={(vals) => {
                  setManagerIds(vals);
                  if (submitError) setSubmitError(null);
                }}
                options={managers.map((m) => ({
                  value: String(m.id),
                  label: m.departmentName ? `${m.userName} · ${m.departmentName}` : m.userName,
                }))}
                placeholder="Chọn người duyệt tiếp theo..."
                isRequired
                isLoading={loadingManagers}
                isDisabled={isSubmitting || loadingManagers}
                description="Bắt buộc chọn ít nhất một người duyệt (có thể chọn nhiều)."
              />
            ) : (
              <AppTextArea
                label="Lý do trả về"
                value={comment}
                onChange={(val) => {
                  setComment(val);
                  if (submitError) setSubmitError(null);
                }}
                placeholder="Nhập nội dung cần bổ sung hoặc điều chỉnh..."
                rows={4}
                isRequired
                isDisabled={isSubmitting}
              />
            )}
          </AppForm>
        </div>
      ) : null}
    </FormDialog>
  );
}
