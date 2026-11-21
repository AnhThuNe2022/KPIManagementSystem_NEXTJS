export function safeInternalRedirect(
  rawTarget: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!rawTarget) return fallback;
  const trimmed = rawTarget.trim();
  if (!trimmed) return fallback;
  // Must start with a single leading slash and never protocol-relative "//" or backslash
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }
  try {
    const parsed = new URL(trimmed, "http://internal.local");
    if (parsed.origin !== "http://internal.local") return fallback;
    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (!normalized.startsWith("/") || normalized.startsWith("//")) return fallback;
    return normalized;
  } catch {
    return fallback;
  }
}

export function resolveInternalLink(rawTarget: string | null | undefined): string | null {
  if (!rawTarget) return null;
  const trimmed = rawTarget.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return null;
  }
  try {
    const parsed = new URL(trimmed, "http://internal.local");
    if (parsed.origin !== "http://internal.local") return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
