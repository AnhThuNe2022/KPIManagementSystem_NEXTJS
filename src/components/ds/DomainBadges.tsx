"use client";

import React from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { Calendar, Clock, User } from "lucide-react";
import {
  resolveActiveStatus,
  resolveAssignmentType,
  resolveBandSpec,
  resolveCompanyLogo,
  resolveConditionStatus,
  resolveEvaluationStatus,
  resolvePeriodStatus,
  resolvePeriodType,
  resolvePublicStatus,
  resolveReadStatus,
  resolveScopeType,
  splitEvaluationStatuses,
} from "@/design-system/registries";
import { getInitials } from "@/lib/format/formatters";

function hashAvatarTone(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 6;
}

function normalizeRibbonTone(variant: string): string {
  switch (variant) {
    case "blue":
    case "info":
      return "blue";
    case "green":
    case "success":
      return "green";
    case "orange":
    case "yellow":
    case "warning":
      return "orange";
    case "purple":
    case "pink":
      return "purple";
    case "red":
    case "error":
      return "red";
    case "teal":
      return "teal";
    case "cyan":
      return "cyan";
    default:
      return "neutral";
  }
}

function StatusRibbonPill({
  label,
  tone,
  reviewing = false,
}: {
  label: string;
  tone: string;
  reviewing?: boolean;
}) {
  return (
    <span
      className="ds-status-ribbon"
      data-tone={normalizeRibbonTone(tone)}
      data-reviewing={reviewing ? "true" : "false"}
      title={label}
    >
      <span className="ds-status-ribbon-dot" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  );
}

/**
 * SINGLE SOURCE OF TRUTH UI component for `isActive`.
 * Controlled entirely by ACTIVE_STATUS_REGISTRY.
 */
export function ActiveStatus({
  isActive,
  compact = false,
}: {
  isActive: boolean | null | undefined;
  compact?: boolean;
}) {
  const spec = resolveActiveStatus(isActive);
  const text = compact ? spec.shortLabel : spec.label;

  if (spec.presentation === "badge") {
    return <Badge variant={spec.badgeVariant} label={text} />;
  }

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <StatusDot variant={spec.dotVariant} label={text} />
      <Text type="supporting">{text}</Text>
    </span>
  );
}

/**
 * SINGLE SOURCE OF TRUTH UI component for EvaluationStatus (handles single or `;`-joined strings).
 * Renders vibrant chevron-ribbon tag with status ring dot.
 */
export function EvaluationStatusBadge({
  status,
  isRejected,
  displayLabel,
  compact = false,
}: {
  status: string | number | null | undefined;
  isRejected?: boolean;
  displayLabel?: string | null;
  compact?: boolean;
}) {
  if (isRejected) {
    const spec = resolveEvaluationStatus(status, { isRejected: true });
    return (
      <StatusRibbonPill
        tone={spec.badgeVariant}
        label={displayLabel?.trim() || (compact ? spec.shortLabel : spec.label)}
      />
    );
  }

  if (typeof status === "string" && status.includes(";")) {
    const parts = splitEvaluationStatuses(status);
    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        {parts.map((part, index) => {
          const spec = resolveEvaluationStatus(part);
          return (
            <StatusRibbonPill
              key={`${part}-${index}`}
              tone={spec.badgeVariant}
              reviewing={spec.isReviewingStep}
              label={compact ? spec.shortLabel : spec.label}
            />
          );
        })}
      </span>
    );
  }

  const spec = resolveEvaluationStatus(status, { fallbackLabel: displayLabel ?? undefined });
  return (
    <StatusRibbonPill
      tone={spec.badgeVariant}
      reviewing={spec.isReviewingStep}
      label={displayLabel?.trim() || (compact ? spec.shortLabel : spec.label)}
    />
  );
}

export function ConditionStatusTag({
  statusCondition,
  fallbackName,
}: {
  statusCondition: string | null | undefined;
  fallbackName?: string | null;
}) {
  const spec = resolveConditionStatus(statusCondition, fallbackName);
  return <Badge variant={spec.badgeVariant} label={spec.label} />;
}

export function BandBadge({ band }: { band: string | null | undefined }) {
  const spec = resolveBandSpec(band);
  if (spec.label === "—") {
    return <Text type="supporting">—</Text>;
  }
  return (
    <span className="ds-band-chip" data-tier={spec.tier} title={`Xếp loại ${spec.label}`}>
      {spec.label}
    </span>
  );
}

export function AssignmentTypeBadge({ type }: { type: number | null | undefined }) {
  const spec = resolveAssignmentType(type);
  return <Badge variant={spec.badgeVariant} label={spec.label} />;
}

export function ScopeTypeBadge({ scopeType }: { scopeType: number | string | null | undefined }) {
  const spec = resolveScopeType(scopeType);
  return <Badge variant={spec.badgeVariant} label={spec.label} />;
}

export function PeriodTypeBadge({ periodType }: { periodType: string | number | null | undefined }) {
  const spec = resolvePeriodType(periodType);
  return <Badge variant={spec.badgeVariant} label={spec.label} />;
}

export function PeriodStatusBadge({ status }: { status: number | string | null | undefined }) {
  const spec = resolvePeriodStatus(status);
  return <Badge variant={spec.badgeVariant} label={spec.label} />;
}

export function PublicStatusBadge({ isPublic }: { isPublic: boolean | null | undefined }) {
  const spec = resolvePublicStatus(isPublic);
  return <Badge variant={spec.badgeVariant} label={spec.label} />;
}

export function ReadStatusBadge({ isRead }: { isRead: boolean | null | undefined }) {
  const spec = resolveReadStatus(isRead);
  return <Badge variant={spec.badgeVariant} label={spec.label} />;
}

export function TagBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "blue" | "red" | "green" | "orange";
}) {
  return <Badge variant={tone} label={label} />;
}

/**
 * Displays official company logo (colors strictly unaltered) alongside company code/name.
 */
export function CompanyChip({
  companyCode,
  companyName,
  size = "sm",
}: {
  companyCode?: string | null;
  companyName?: string | null;
  size?: "sm" | "md";
}) {
  const logoSrc = resolveCompanyLogo(companyCode);
  const primaryText = companyCode?.trim() || companyName?.trim() || "—";
  const imgClass = size === "md" ? "h-6 w-6" : "h-5 w-5";

  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoSrc}
        alt={primaryText}
        className={`${imgClass} shrink-0 object-contain`}
      />
      <span className="truncate text-sm font-medium text-primary" title={companyName || primaryText}>
        {primaryText}
      </span>
    </span>
  );
}

/**
 * Vibrant Identity Cell with deterministic gradient avatar (or soft icon tile),
 * optional boxed company tag, employee code, and department subtitle.
 */
export function UserIdentityCell({
  name,
  subtitle,
  companyCode,
  code,
  department,
  size = "sm",
  avatarVariant = "avatar",
}: {
  name: string | null | undefined;
  subtitle?: string | null;
  companyCode?: string | null;
  code?: string | null;
  department?: string | null;
  size?: "xsm" | "sm" | "md";
  avatarVariant?: "avatar" | "icon";
}) {
  const displayName = name?.trim() || "Chưa có tên";
  const sizeClass =
    size === "xsm"
      ? "h-7 w-7 text-[11px]"
      : size === "md"
        ? "h-10 w-10 text-sm"
        : "h-8 w-8 text-xs";
  const tone = hashAvatarTone(`${displayName}:${code ?? subtitle ?? ""}`);
  const hasRichMeta = Boolean(companyCode || code || department);

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      {avatarVariant === "icon" ? (
        <span className="ds-identity-tile" aria-hidden="true">
          <User className="h-4 w-4" />
        </span>
      ) : (
        <span className={`ds-avatar-grad ${sizeClass}`} data-tone={tone} aria-hidden="true">
          {getInitials(displayName)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-primary" title={displayName}>
          {displayName}
        </div>
        {hasRichMeta ? (
          <div className="mt-0.5 flex flex-col gap-0.5 min-w-0">
            {companyCode || code ? (
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                {companyCode ? <span className="ds-company-pill">{companyCode}</span> : null}
                {code ? (
                  <span className="truncate text-xs tabular-nums text-secondary" title={code}>
                    {code}
                  </span>
                ) : null}
              </div>
            ) : null}
            {department ? (
              <div className="truncate text-xs text-secondary" title={department}>
                {department}
              </div>
            ) : null}
          </div>
        ) : subtitle ? (
          <div className="truncate text-xs text-secondary" title={subtitle}>
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Period badge cell with soft tinted calendar tile + period title.
 */
export function PeriodBadgeCell({
  label,
  sublabel,
}: {
  label: string | null | undefined;
  sublabel?: string | null;
}) {
  const text = label?.trim() || "—";
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="ds-period-tile" aria-hidden="true">
        <Calendar className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex flex-col">
        <span className="truncate text-sm font-semibold text-primary" title={text}>
          {text}
        </span>
        {sublabel ? (
          <span className="truncate text-xs text-secondary" title={sublabel}>
            {sublabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Dual bold KPI score pair (e.g. Tổng điểm | Quản lý) with crisp vertical divider.
 */
export function ScorePairCell({
  primary,
  primaryLabel,
  secondary,
  secondaryLabel,
}: {
  primary: string;
  primaryLabel: string;
  secondary?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="ds-score-pair">
      <div className="ds-score-block">
        <span className="ds-score-value">{primary}</span>
        <span className="ds-score-caption">{primaryLabel}</span>
      </div>
      {secondary !== undefined && secondaryLabel ? (
        <>
          <span className="ds-score-divider" aria-hidden="true" />
          <div className="ds-score-block">
            <span className="ds-score-value">{secondary}</span>
            <span className="ds-score-caption">{secondaryLabel}</span>
          </div>
        </>
      ) : null}
    </div>
  );
}

/**
 * Approver + amber clock timestamp cell (clean scannable layout).
 */
export function ApproverTimeCell({
  name,
  timestamp,
}: {
  name?: string | null;
  timestamp?: string | null;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      {name ? (
        <span className="truncate text-sm font-semibold text-primary" title={name}>
          {name}
        </span>
      ) : null}
      {timestamp ? (
        <span className="inline-flex items-center gap-1.5 text-xs tabular-nums text-secondary">
          <Clock className="ds-clock-icon h-3.5 w-3.5" aria-hidden="true" />
          <span className="truncate">{timestamp}</span>
        </span>
      ) : !name ? (
        <span className="text-xs text-secondary">—</span>
      ) : null}
    </div>
  );
}
