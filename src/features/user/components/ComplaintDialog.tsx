"use client";

import { useEffect, useRef } from "react";
import {
  Cross2Icon,
  PaperPlaneIcon,
} from "@radix-ui/react-icons";
import styles from "../user-information.module.css";

interface ComplaintDialogProps {
  open: boolean;
  value: string;
  loading?: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function ComplaintDialog({
  open,
  value,
  loading = false,
  onChange,
  onClose,
  onSubmit,
}: ComplaintDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      className={styles.dialog}
      ref={dialogRef}
      aria-labelledby="ComplaintDialog-title"
      onCancel={event => {
        event.preventDefault();
        if (!loading) onClose();
      }}
    >
      <div className={styles.dialogSurface}>
        {/* Header */}
        <div className={styles.dialogHeader}>
          <h2 id="ComplaintDialog-title" className="text-lg font-semibold">
            Báo với admin
          </h2>
        </div>

        {/* Content */}
        <div className={styles.dialogBody}>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
            Nhập thông tin sai hoặc cần báo với admin:
          </p>

          <textarea
            aria-label="Thông tin cần điều chỉnh"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            autoFocus
            placeholder="Nhập nội dung tại đây..."
            className="
              w-full
              resize-y
              rounded-lg
              border
              border-gray-300
              bg-gray-50
              px-3
              py-2
              text-sm
              outline-none
              transition
              focus:border-red-500
              focus:ring-1
              focus:ring-red-500
              dark:border-gray-700
              dark:bg-gray-800
              dark:text-white
            "
          />
        </div>

        {/* Actions */}
        <div className={styles.dialogFooter}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={styles.button}
          >
            <Cross2Icon aria-hidden="true" />
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className={styles.primaryButton}
          >
            <PaperPlaneIcon aria-hidden="true" />
            {loading ? "Đang gửi..." : "Xác nhận"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
