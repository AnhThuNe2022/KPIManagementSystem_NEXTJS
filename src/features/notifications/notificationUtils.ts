import { EnumCodeNoti, type NotificationItem } from "./types";

const COMPLAINT_CODES = new Set<string>(Object.values(EnumCodeNoti));

export function isComplaintNotification(item: NotificationItem): boolean {
  return Boolean(item.alertGroupId && item.codeNoti && COMPLAINT_CODES.has(item.codeNoti));
}
