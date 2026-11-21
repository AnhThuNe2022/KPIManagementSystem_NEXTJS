const scoreFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 2,
});

export function normalizeVietnamese(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
}

export function formatScore(value: number | null | undefined, fallback = "—"): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return fallback;
  }
  return scoreFormatter.format(Number(value));
}

export function formatDate(value: string | Date | null | undefined, fallback = "—"): string {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime()) || date.getFullYear() <= 1) return fallback;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTime(value: string | Date | null | undefined, fallback = "—"): string {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime()) || date.getFullYear() <= 1) return fallback;
  const datePart = formatDate(date, fallback);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${datePart} ${hours}:${minutes}`;
}

export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getFullYear() <= 1) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getInitials(name: string | null | undefined, fallback = "DC"): string {
  if (!name?.trim()) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[parts.length - 2][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase() || fallback;
}
