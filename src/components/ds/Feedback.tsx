"use client";

import React, { useCallback, type ReactNode } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Skeleton } from "@astryxdesign/core/Skeleton";
import { Spinner } from "@astryxdesign/core/Spinner";
import { useToast } from "@astryxdesign/core/Toast";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";
import { AppButton } from "./Buttons";

export type AppToastTone = "success" | "error" | "warning" | "info";

export function useAppToast() {
  const showToast = useToast();

  return useCallback(
    (tone: AppToastTone, message: string, uniqueID?: string) => {
      const iconMap: Record<AppToastTone, ReactNode> = {
        success: <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />,
        error: <XCircle className="h-4 w-4 shrink-0 text-error" />,
        warning: <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />,
        info: <Info className="h-4 w-4 shrink-0 text-info" />,
      };

      showToast({
        body: message,
        type: tone === "error" ? "error" : "info",
        isAutoHide: true,
        autoHideDuration: tone === "error" ? 6000 : 4000,
        uniqueID,
        collisionBehavior: "overwrite",
        renderContent: ({ body, dismiss }) => (
          <div className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
            {iconMap[tone]}
            <span className="flex-1 leading-snug">{body}</span>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Đóng thông báo"
              className="rounded-sm p-1 opacity-75 ds-interactive hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      });
    },
    [showToast],
  );
}

export function InlineErrorBanner({
  title = "Không tải được dữ liệu",
  message,
  onRetry,
  isUnauthorized = false,
  loginNextPath,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  isUnauthorized?: boolean;
  loginNextPath?: string;
}) {
  return (
    <div className="ds-fade-in">
      <Banner
        status="error"
        title={title}
        description={message}
        endContent={
          <div className="flex items-center gap-2">
            {isUnauthorized ? (
              <AppButton
                label="Đăng nhập lại"
                variant="primary"
                size="sm"
                href={loginNextPath ? `/login?next=${encodeURIComponent(loginNextPath)}` : "/login"}
              />
            ) : null}
            {onRetry ? (
              <AppButton label="Thử lại" variant="secondary" size="sm" onClick={onRetry} />
            ) : null}
          </div>
        }
      />
    </div>
  );
}

export function AppEmptyState({
  title,
  description,
  icon,
  actions,
  isCompact = false,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  isCompact?: boolean;
}) {
  return (
    <div className="py-6 ds-fade-in">
      <EmptyState
        title={title}
        description={description}
        icon={icon}
        actions={actions}
        isCompact={isCompact}
      />
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="flex flex-col gap-3 p-4" aria-busy="true" aria-label="Đang tải dữ liệu">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div
          key={rIdx}
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((__, cIdx) => (
            <Skeleton key={cIdx} height={20} width="100%" index={rIdx + cIdx} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function LoadingOverlay({ label = "Đang tải..." }: { label?: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 p-8 text-secondary">
      <Spinner size="md" aria-label={label} />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ExportProgressBar({
  label,
  value,
  isIndeterminate = false,
  onCancel,
}: {
  label: string;
  value: number;
  isIndeterminate?: boolean;
  onCancel?: () => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3 shadow-sm ds-fade-in">
      <div className="flex-1 min-w-0">
        <ProgressBar
          label={label}
          value={value}
          max={100}
          hasValueLabel={!isIndeterminate}
          isIndeterminate={isIndeterminate}
          variant={value >= 100 ? "success" : "accent"}
        />
      </div>
      {onCancel ? (
        <AppButton label="Hủy" variant="secondary" size="sm" onClick={onCancel} />
      ) : null}
    </div>
  );
}
