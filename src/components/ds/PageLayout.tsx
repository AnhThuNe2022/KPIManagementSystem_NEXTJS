"use client";

import React, { type ReactNode } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { Check, Clock, XCircle } from "lucide-react";
import { formatDateTime } from "@/lib/format/formatters";
import { EvaluationStatusBadge } from "./DomainBadges";

export function PageFrame({
  children,
  maxWidth = "full",
}: {
  children: ReactNode;
  maxWidth?: "full" | "wide" | "narrow";
}) {
  const widthClass =
    maxWidth === "narrow"
      ? "mx-auto w-full max-w-4xl"
      : maxWidth === "wide"
        ? "mx-auto w-full max-w-7xl"
        : "w-full";

  return <div className={`${widthClass} flex flex-col gap-5 p-4 md:p-6 ds-fade-in`}>{children}</div>;
}

export type PageHeaderArtwork =
  | "dashboard"
  | "evaluation"
  | "summary"
  | "organization"
  | "admin"
  | "personal";

const ARTWORK_SRC: Record<PageHeaderArtwork, string> = {
  dashboard: "/images/headers/wave-dashboard.webp",
  evaluation: "/images/headers/wave-evaluation.webp",
  summary: "/images/headers/wave-summary.webp",
  organization: "/images/headers/art-organization.webp",
  admin: "/images/headers/art-admin.webp",
  personal: "/images/headers/wave-personal.webp",
};

export function PageHeader({
  eyebrow,
  title,
  description,
  badge,
  actions,
  artwork = "dashboard",
  icon,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  artwork?: PageHeaderArtwork;
  icon?: ReactNode;
}) {
  return (
    <header
      data-artwork={artwork}
      className="ds-page-header relative overflow-hidden rounded-2xl border border-border bg-surface"
    >
      <div className="ds-page-header-accent" aria-hidden="true" />
      <div className="ds-page-header-ambient" aria-hidden="true" />
      <div className="ds-page-header-art" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ARTWORK_SRC[artwork]} alt="" decoding="async" />
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-6 md:py-5">
        <div className="flex min-w-0 flex-1 items-start gap-3.5">
          {icon ? (
            <span className="ds-page-header-icon mt-0.5" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {eyebrow ? <span className="ds-page-header-eyebrow">{eyebrow}</span> : null}
            <div className="flex flex-wrap items-center gap-2.5">
              <Heading level={2}>{title}</Heading>
              {badge}
            </div>
            {description ? (
              <div className="max-w-2xl">
                <Text type="supporting">{description}</Text>
              </div>
            ) : null}
          </div>
        </div>
        {actions ? <div className="ds-page-header-actions">{actions}</div> : null}
      </div>
    </header>
  );
}

export interface MetricCardItem {
  id: string;
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: "blue" | "green" | "orange" | "red" | "neutral";
}

export function MetricStrip({ items }: { items: MetricCardItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.id} className="ds-metric-card" data-tone={item.tone ?? "blue"}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-secondary">{item.label}</div>
              <div className="mt-1.5 text-2xl font-extrabold tracking-tight tabular-nums text-primary">
                {item.value}
              </div>
              {item.hint ? (
                <div className="mt-1 truncate text-xs text-secondary">{item.hint}</div>
              ) : null}
            </div>
            {item.icon ? (
              <div className="ds-metric-icon" aria-hidden="true">
                {item.icon}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MasterDetailFrame({
  main,
  detail,
  isDetailOpen = true,
  detailWidth = "lg:w-[360px] xl:w-[400px]",
}: {
  main: ReactNode;
  detail: ReactNode;
  isDetailOpen?: boolean;
  detailWidth?: string;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">{main}</div>
      {isDetailOpen ? (
        <aside
          className={`w-full shrink-0 ${detailWidth} lg:sticky lg:top-4 ds-fade-in ds-panel-transition`}
        >
          {detail}
        </aside>
      ) : null}
    </div>
  );
}

export interface TimelineEntry {
  id: string | number;
  actorName: string;
  roleOrLevel?: string | null;
  status?: string | null;
  statusLabel?: string | null;
  comment?: string | null;
  timestamp?: string | null;
}

function resolveCompactTimelineTone(status?: string | null): "waiting" | "success" | "danger" | "info" {
  const s = (status ?? "").toLowerCase();
  if (s.includes("reject") || s.includes("denied") || s.includes("từ chối")) return "danger";
  if (s.includes("pending") || s.includes("reviewing") || s.includes("chờ")) return "waiting";
  if (s.includes("approved") || s.includes("completed") || s.includes("done") || s.includes("hoàn tất")) {
    return "success";
  }
  return "info";
}

export function ApprovalTimeline({
  entries,
  emptyLabel = "Chưa có lịch sử phê duyệt.",
  highlightFirst = false,
}: {
  entries: TimelineEntry[];
  emptyLabel?: string;
  highlightFirst?: boolean;
}) {
  if (entries.length === 0) {
    return <Text type="supporting">{emptyLabel}</Text>;
  }

  return (
    <ol className="ds-compact-timeline">
      {entries.map((entry, idx) => {
        const tone = resolveCompactTimelineTone(entry.status ?? entry.statusLabel);
        const isLatest = highlightFirst && idx === 0;
        return (
          <li key={entry.id} className="ds-compact-timeline-item">
            <span
              aria-hidden="true"
              className="ds-compact-timeline-node"
              data-tone={tone}
            >
              {tone === "danger" ? (
                <XCircle className="h-3.5 w-3.5" />
              ) : tone === "waiting" ? (
                <Clock className="h-3.5 w-3.5" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </span>

            <div className="ds-compact-timeline-card" data-latest={isLatest ? "true" : undefined}>
              <div className="flex flex-wrap items-start justify-between gap-1.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-primary">
                    {entry.actorName}
                  </div>
                  {entry.roleOrLevel ? (
                    <div className="text-xs font-medium text-secondary">{entry.roleOrLevel}</div>
                  ) : null}
                </div>
                {entry.status || entry.statusLabel ? (
                  <EvaluationStatusBadge
                    status={entry.status}
                    displayLabel={entry.statusLabel}
                    compact
                  />
                ) : null}
              </div>

              {entry.comment ? (
                <p className="ds-timeline-quote mt-2">{entry.comment}</p>
              ) : null}

              {entry.timestamp ? (
                <div className="mt-2 flex items-center gap-1 text-xs tabular-nums text-secondary">
                  <Clock className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                  <span>{formatDateTime(entry.timestamp)}</span>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
