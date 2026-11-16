"use client";

import type { ReactNode } from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
import "./FloatingSelectionBar.css";

export interface FloatingSelectionAction {
  key: string;
  label: string;
  icon?: ReactNode;
  tone?: "default" | "primary" | "danger";
  disabled?: boolean;
  onClick: () => void;
}

interface FloatingSelectionBarProps {
  count: number;
  label: string;
  actions: readonly FloatingSelectionAction[];
  onClear: () => void;
  clearLabel?: string;
  disabled?: boolean;
}

const numberFormat = new Intl.NumberFormat("vi-VN");

export function FloatingSelectionBar({
  count,
  label,
  actions,
  onClear,
  clearLabel = "Bỏ chọn tất cả",
  disabled = false,
}: FloatingSelectionBarProps) {
  if (count <= 0) return null;

  return (
    <div className="floating-selection-bar" role="region" aria-label="Thao tác mục đã chọn">
      <div className="floating-selection-bar__pill">
        <div className="floating-selection-bar__summary" role="status" aria-live="polite">
          <span className="floating-selection-bar__badge">{numberFormat.format(count)}</span>
          <span className="floating-selection-bar__label">{label}</span>
        </div>

        <span className="floating-selection-bar__divider" aria-hidden="true" />

        <div className="floating-selection-bar__actions">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              className="floating-selection-bar__action"
              data-tone={action.tone ?? "default"}
              disabled={disabled || action.disabled}
              onClick={action.onClick}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="floating-selection-bar__clear"
          aria-label={clearLabel}
          title={clearLabel}
          disabled={disabled}
          onClick={onClear}
        >
          <Cross2Icon aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
