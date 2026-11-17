export function searchText(value: string) {
  return value
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

export function internalNotificationLink(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || url.protocol !== window.location.protocol)
      return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}
