"use client";

import React, { useState, type ReactNode } from "react";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Drawer, DrawerHeader } from "@astryxdesign/core/Drawer";
import { Heading } from "@astryxdesign/core/Heading";
import type { ButtonVariant } from "@astryxdesign/core/Button";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { AppButton, AppIconButton } from "./Buttons";

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  confirmVariant = "destructive",
  icon,
  isLoading = false,
  onConfirm,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  icon?: ReactNode;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const isDestructive = confirmVariant === "destructive";

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isLoading) return;
    onOpenChange(nextOpen);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      purpose="form"
      width={440}
    >
      <div className="flex flex-col p-1">
        <span
          className="ds-confirm-icon"
          data-tone={isDestructive ? "danger" : "info"}
          aria-hidden="true"
        >
          {icon ??
            (isDestructive ? (
              <Trash2 className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            ))}
        </span>

        <div className="mt-4">
          <Heading level={3}>{title}</Heading>
        </div>

        <div className="mt-2 text-sm leading-relaxed text-secondary">
          {description}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5">
          <AppButton
            label={cancelLabel}
            variant="secondary"
            isDisabled={isLoading}
            onClick={() => handleOpenChange(false)}
          />
          <span className={isDestructive ? "ds-confirm-danger" : undefined}>
            <AppButton
              label={confirmLabel}
              variant={confirmVariant}
              isLoading={isLoading}
              isDisabled={isLoading}
              onClick={() => void onConfirm()}
            />
          </span>
        </div>
      </div>
    </Dialog>
  );
}

export function DetailDialog({
  isOpen,
  onOpenChange,
  title,
  subtitle,
  headerEndContent,
  footer,
  width = 640,
  children,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  subtitle?: ReactNode;
  headerEndContent?: ReactNode;
  footer?: ReactNode;
  width?: number | string;
  children: ReactNode;
}) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="info" width={width} maxHeight="85dvh">
      <div className="flex flex-col gap-4">
        <DialogHeader
          title={title}
          subtitle={subtitle}
          endContent={headerEndContent}
          onOpenChange={onOpenChange}
          hasDivider
        />
        <div className="min-w-0">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
            {footer}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}

/**
 * FormDialog with built-in Astryx AlertDialog unsaved-changes guard (ZERO window.confirm).
 */
export function FormDialog({
  isOpen,
  onOpenChange,
  title,
  subtitle,
  headerEndContent,
  width = 580,
  isDirty = false,
  isSubmitting = false,
  submitLabel = "Lưu",
  cancelLabel = "Hủy",
  submitDisabled = false,
  onSubmit,
  extraFooter,
  children,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  subtitle?: ReactNode;
  headerEndContent?: ReactNode;
  width?: number | string;
  isDirty?: boolean;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  submitDisabled?: boolean;
  onSubmit?: () => void | Promise<void>;
  extraFooter?: ReactNode;
  children: ReactNode;
}) {
  const [discardPromptOpen, setDiscardPromptOpen] = useState(false);

  const handleRequestClose = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    if (isSubmitting) return;
    if (isDirty) {
      setDiscardPromptOpen(true);
      return;
    }
    onOpenChange(false);
  };

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onOpenChange={handleRequestClose}
        purpose="form"
        width={width}
        maxHeight="88dvh"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit?.();
          }}
          className="flex flex-col gap-4"
        >
          <DialogHeader
            title={title}
            subtitle={subtitle}
            endContent={headerEndContent}
            onOpenChange={handleRequestClose}
            hasDivider
          />
          <div className="min-w-0">{children}</div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <div>{extraFooter}</div>
            <div className="flex items-center gap-2">
              <AppButton
                label={cancelLabel}
                variant="secondary"
                isDisabled={isSubmitting}
                onClick={() => handleRequestClose(false)}
              />
              {onSubmit ? (
                <AppButton
                  type="submit"
                  label={submitLabel}
                  variant="primary"
                  isLoading={isSubmitting}
                  isDisabled={submitDisabled || isSubmitting}
                />
              ) : null}
            </div>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        isOpen={discardPromptOpen}
        onOpenChange={setDiscardPromptOpen}
        title="Bỏ các thay đổi chưa lưu?"
        description="Các thay đổi bạn vừa nhập chưa được lưu và sẽ bị mất nếu đóng cửa sổ này."
        confirmLabel="Bỏ thay đổi"
        cancelLabel="Tiếp tục chỉnh sửa"
        confirmVariant="destructive"
        onConfirm={() => {
          setDiscardPromptOpen(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}

/**
 * Right-anchored slide-over FormDrawer with illustrated wave banner and AlertDialog dirty-guard.
 */
export function FormDrawer({
  isOpen,
  onOpenChange,
  title,
  subtitle,
  headerIcon,
  headerEndContent,
  headerArtwork = true,
  width = 500,
  isDirty = false,
  isSubmitting = false,
  submitLabel = "Lưu thay đổi",
  submitIcon,
  cancelLabel = "Hủy",
  submitDisabled = false,
  onSubmit,
  extraFooter,
  children,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  subtitle?: ReactNode;
  headerIcon?: ReactNode;
  headerEndContent?: ReactNode;
  headerArtwork?: boolean;
  width?: number | string;
  isDirty?: boolean;
  isSubmitting?: boolean;
  submitLabel?: string;
  submitIcon?: ReactNode;
  cancelLabel?: string;
  submitDisabled?: boolean;
  onSubmit?: () => void | Promise<void>;
  extraFooter?: ReactNode;
  children: ReactNode;
}) {
  const [discardPromptOpen, setDiscardPromptOpen] = useState(false);

  const handleRequestClose = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    if (isSubmitting) return;
    if (isDirty) {
      setDiscardPromptOpen(true);
      return;
    }
    onOpenChange(false);
  };

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onOpenChange={handleRequestClose}
        side="end"
        width={width}
        padding={0}
        className="ds-drawer-sheet"
        label={typeof title === "string" ? title : "Biểu mẫu"}
        purpose="form"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit?.();
          }}
          className="flex h-full min-h-0 flex-col"
        >
          {headerArtwork ? (
            <header className="ds-drawer-hero shrink-0">
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 800 320"
                preserveAspectRatio="none"
                className="ds-drawer-hero-waves"
              >
                <path
                  className="ds-drawer-wave-1"
                  d="M0 320 C118 312 129 118 276 65 C406 18 499 100 625 51 C666 35 696 15 716 0 H800 V320 Z"
                />
                <path
                  className="ds-drawer-wave-2"
                  d="M185 320 C289 312 306 190 416 150 C535 106 601 190 705 132 C755 104 773 50 800 24 V320 Z"
                />
                <path
                  className="ds-drawer-wave-3"
                  d="M421 320 C502 303 517 237 591 217 C671 196 725 260 800 191 V320 Z"
                />
              </svg>

              {headerIcon ? (
                <span className="ds-drawer-hero-icon" aria-hidden="true">
                  {headerIcon}
                </span>
              ) : null}

              <div className="relative z-10 min-w-0 flex-1">
                <h2 className="ds-drawer-hero-title truncate text-[19px] font-bold leading-snug tracking-tight">
                  {title}
                </h2>
                {subtitle ? (
                  <p className="ds-drawer-hero-subtitle mt-0.5 truncate text-xs leading-relaxed">
                    {subtitle}
                  </p>
                ) : null}
              </div>

              {headerEndContent ? (
                <div className="relative z-10 shrink-0">{headerEndContent}</div>
              ) : null}

              <div className="ds-drawer-hero-close-wrap relative z-10 ml-auto shrink-0">
                <AppIconButton
                  label="Đóng khung chỉnh sửa"
                  variant="ghost"
                  size="sm"
                  isDisabled={isSubmitting}
                  icon={<X className="h-4 w-4" />}
                  onClick={() => handleRequestClose(false)}
                />
              </div>
            </header>
          ) : (
            <div className="shrink-0 px-6 pt-5">
              <DrawerHeader
                title={title}
                subtitle={subtitle}
                endContent={headerEndContent}
                onOpenChange={handleRequestClose}
                hasDivider
              />
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">{children}</div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-t border-border bg-surface px-6 py-4">
            <div>{extraFooter}</div>
            <div className="flex items-center gap-2.5">
              <AppButton
                label={cancelLabel}
                variant="secondary"
                isDisabled={isSubmitting}
                onClick={() => handleRequestClose(false)}
              />
              {onSubmit ? (
                <AppButton
                  type="submit"
                  label={submitLabel}
                  icon={submitIcon}
                  variant="primary"
                  isLoading={isSubmitting}
                  isDisabled={submitDisabled || isSubmitting}
                />
              ) : null}
            </div>
          </div>
        </form>
      </Drawer>

      <ConfirmDialog
        isOpen={discardPromptOpen}
        onOpenChange={setDiscardPromptOpen}
        title="Bỏ các thay đổi chưa lưu?"
        description="Các thay đổi bạn vừa nhập chưa được lưu và sẽ bị mất nếu đóng ngăn chỉnh sửa."
        confirmLabel="Bỏ thay đổi"
        cancelLabel="Tiếp tục chỉnh sửa"
        confirmVariant="destructive"
        onConfirm={() => {
          setDiscardPromptOpen(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}

/**
 * Zero-padding Astryx Dialog shell for custom-chrome modal workspaces (e.g. conversation box).
 */
export function SurfaceDialog({
  isOpen,
  onOpenChange,
  width = 880,
  maxHeight = "88dvh",
  purpose = "info",
  className,
  labelledBy,
  children,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  width?: number | string;
  maxHeight?: number | string;
  purpose?: "info" | "form" | "required";
  className?: string;
  labelledBy?: string;
  children: ReactNode;
}) {
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      purpose={purpose}
      padding={0}
      width={width}
      maxHeight={maxHeight}
      className={className}
      aria-labelledby={labelledBy}
    >
      {children}
    </Dialog>
  );
}

/**
 * Left-anchored Astryx Drawer for responsive mobile navigation (replaces raw <dialog>).
 */
export function NavigationDrawer({
  isOpen,
  onOpenChange,
  label = "Menu điều hướng",
  width = 304,
  children,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  label?: string;
  width?: number | string;
  children: ReactNode;
}) {
  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      side="start"
      width={width}
      label={label}
      purpose="info"
    >
      <div className="flex h-full flex-col overflow-hidden">{children}</div>
    </Drawer>
  );
}
