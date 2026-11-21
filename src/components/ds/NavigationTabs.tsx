"use client";

import React, { useRef, type KeyboardEvent, type ReactNode } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { LayoutGrid, Table2 } from "lucide-react";

export interface AppTabItem {
  value: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

export type FilterTabTone = "blue" | "orange" | "green" | "neutral";

export interface StatusFilterTabItem {
  value: string;
  label: string;
  count?: number;
  icon?: ReactNode;
  tone?: FilterTabTone;
}

export function AppTabs({
  items,
  value,
  onChange,
  size = "md",
  hasDivider = true,
}: {
  items: AppTabItem[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md" | "lg";
  hasDivider?: boolean;
}) {
  return (
    <TabList value={value} onChange={onChange} size={size} hasDivider={hasDivider}>
      {items.map((item) => (
        <Tab
          key={item.value}
          value={item.value}
          label={item.label}
          icon={item.icon}
          endContent={
            typeof item.count === "number" ? (
              <Badge variant={value === item.value ? "blue" : "neutral"} label={item.count} />
            ) : undefined
          }
        />
      ))}
    </TabList>
  );
}

/**
 * Recessed tactile pill-dock filter tabs with elevated Deoca active state
 * and separated tabular-nums count pills. Single Source of Truth across all list screens.
 */
export function StatusFilterTabs({
  label = "Lọc trạng thái",
  items,
  value,
  onChange,
  size = "sm",
}: {
  label?: string;
  items: StatusFilterTabItem[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md";
}) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (items.length <= 1) return;
    let nextIndex = -1;
    if (e.key === "ArrowRight") nextIndex = (index + 1) % items.length;
    else if (e.key === "ArrowLeft") nextIndex = (index - 1 + items.length) % items.length;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = items.length - 1;
    if (nextIndex === -1) return;

    e.preventDefault();
    const target = items[nextIndex];
    if (!target) return;
    onChange(target.value);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="ds-filter-tabs" data-size={size} role="tablist" aria-label={label}>
      {items.map((item, idx) => {
        const isSelected = value === item.value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              tabRefs.current[idx] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            data-tone={item.tone ?? "blue"}
            className="ds-filter-tab"
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
          >
            {item.icon ? <span className="ds-filter-tab-icon">{item.icon}</span> : null}
            <span>{item.label}</span>
            {typeof item.count === "number" ? (
              <span
                className="ds-filter-tab-count"
                data-zero={item.count === 0 ? "true" : undefined}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function ViewModeToggle({
  value,
  onChange,
  gridLabel = "Thẻ",
}: {
  value: "table" | "grid";
  onChange: (value: "table" | "grid") => void;
  gridLabel?: string;
}) {
  return (
    <StatusFilterTabs
      label="Chế độ hiển thị"
      value={value}
      onChange={(next) => onChange(next === "grid" ? "grid" : "table")}
      size="sm"
      items={[
        { value: "table", label: "Bảng", icon: <Table2 className="h-3.5 w-3.5" /> },
        { value: "grid", label: gridLabel, icon: <LayoutGrid className="h-3.5 w-3.5" /> },
      ]}
    />
  );
}
