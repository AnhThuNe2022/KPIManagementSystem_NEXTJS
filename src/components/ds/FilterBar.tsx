"use client";

import React, { useState, type ReactNode } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Token } from "@astryxdesign/core/Token";
import { Filter, RotateCcw, Search } from "lucide-react";
import { AppButton } from "./Buttons";

export interface ActiveFilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

export function ActiveFilterChips({
  chips,
  onClearAll,
}: {
  chips: ActiveFilterChip[];
  onClearAll?: () => void;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1 ds-fade-in">
      <span className="text-xs font-medium text-secondary">Đang lọc:</span>
      {chips.map((chip) => (
        <Token key={chip.key} label={chip.label} size="sm" color="blue" onRemove={chip.onRemove} />
      ))}
      {onClearAll && chips.length > 1 ? (
        <AppButton label="Xóa tất cả" variant="ghost" size="sm" onClick={onClearAll} />
      ) : null}
    </div>
  );
}

/**
 * Unified FilterBar with primary controls, smoothly collapsible "Lọc thêm" drawer,
 * active filter chips, and optional explicit Apply / Reset actions.
 */
export function FilterBar({
  primaryControls,
  advancedControls,
  advancedActiveCount = 0,
  chips = [],
  onApply,
  onReset,
  applyLabel = "Áp dụng",
  isDirty = false,
  isApplyDisabled = false,
  defaultAdvancedOpen = false,
  advancedOpen: controlledOpen,
  onAdvancedOpenChange,
  trailingActions,
}: {
  primaryControls: ReactNode;
  advancedControls?: ReactNode;
  advancedActiveCount?: number;
  chips?: ActiveFilterChip[];
  onApply?: () => void;
  onReset?: () => void;
  applyLabel?: string;
  isDirty?: boolean;
  isApplyDisabled?: boolean;
  defaultAdvancedOpen?: boolean;
  advancedOpen?: boolean;
  onAdvancedOpenChange?: (open: boolean) => void;
  trailingActions?: ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultAdvancedOpen);
  const isAdvancedOpen = controlledOpen ?? uncontrolledOpen;
  const setAdvancedOpen = (next: boolean) => {
    setUncontrolledOpen(next);
    onAdvancedOpenChange?.(next);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply?.();
      }}
      className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[260px] flex-1 flex-wrap items-end gap-3">{primaryControls}</div>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {advancedControls ? (
            <AppButton
              label="Lọc thêm"
              variant={isAdvancedOpen ? "primary" : "secondary"}
              size="md"
              icon={<Filter className="h-4 w-4" />}
              endContent={
                advancedActiveCount > 0 ? (
                  <Badge variant="info" label={advancedActiveCount} />
                ) : undefined
              }
              onClick={() => setAdvancedOpen(!isAdvancedOpen)}
            />
          ) : null}
          {onReset ? (
            <AppButton
              label="Xóa lọc"
              variant="secondary"
              size="md"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={onReset}
            />
          ) : null}
          {onApply ? (
            <AppButton
              type="submit"
              label={applyLabel}
              variant="primary"
              size="md"
              icon={<Search className="h-4 w-4" />}
              isDisabled={isApplyDisabled}
            />
          ) : null}
          {trailingActions}
        </div>
      </div>

      {advancedControls ? (
        <div className="ds-collapsible" data-open={isAdvancedOpen ? "true" : "false"}>
          <div className="ds-collapsible-inner">
            <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-4">
              {advancedControls}
            </div>
          </div>
        </div>
      ) : null}

      {isDirty && onApply ? (
        <p className="text-xs text-warning">
          Bộ lọc đã thay đổi — nhấn &ldquo;{applyLabel}&rdquo; để cập nhật danh sách.
        </p>
      ) : null}

      <ActiveFilterChips chips={chips} onClearAll={onReset} />
    </form>
  );
}
