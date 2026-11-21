import type { AstryxBadgeVariant } from "./activeStatus.registry";

export interface BandSpec {
  tier: "A" | "B" | "C" | "D" | "unknown";
  badgeVariant: AstryxBadgeVariant;
}

/**
 * SINGLE SOURCE OF TRUTH for KPI Band / Rating display across Reviewed & Summary screens.
 */
export const BAND_REGISTRY: Record<BandSpec["tier"], BandSpec> = {
  A: { tier: "A", badgeVariant: "green" },
  B: { tier: "B", badgeVariant: "blue" },
  C: { tier: "C", badgeVariant: "orange" },
  D: { tier: "D", badgeVariant: "red" },
  unknown: { tier: "unknown", badgeVariant: "neutral" },
};

export function resolveBandSpec(band: string | null | undefined): BandSpec & { label: string } {
  const normalized = String(band ?? "").trim().toUpperCase();
  if (!normalized) {
    return { ...BAND_REGISTRY.unknown, label: "—" };
  }
  if (normalized.startsWith("A")) return { ...BAND_REGISTRY.A, label: normalized };
  if (normalized.startsWith("B")) return { ...BAND_REGISTRY.B, label: normalized };
  if (normalized.startsWith("C")) return { ...BAND_REGISTRY.C, label: normalized };
  if (normalized.startsWith("D")) return { ...BAND_REGISTRY.D, label: normalized };
  return { ...BAND_REGISTRY.unknown, label: normalized };
}
