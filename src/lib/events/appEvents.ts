export const MENUS_CHANGED_EVENT = "menus-changed";
export const NOTIFICATIONS_CHANGED_EVENT = "notifications:changed";

export function emitAppEvent(name: string): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(name));
  }
}

export function subscribeAppEvent(name: string, handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(name, handler);
  return () => window.removeEventListener(name, handler);
}
