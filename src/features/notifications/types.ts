export interface NotificationDto {
  alertGroupId?: string;
  userId?: string;
  senderUserId?: string;
  codeNoti?: string;
  message?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export enum EnumCodeNoti {
  COMPLAINT = "COMPLAINT",
  RESOLVED = "RESOLVED",
  COMPLAINT_ADMIN = "COMPLAINT_ADMIN",
}

export interface NotificationItem {
  id: number;
  message: string;
  isRead: boolean;
  createdAt: string | null;
  linkNoti?: string | null;
  userName?: string | null;
  userSystemCode?: string | null;
  codeNoti?: string | null;
  senderUserId?: string | null;
  alertGroupId?: string | null;
}

export interface NotificationPage {
  unreadCount: number;
  total: number;
  items: NotificationItem[];
  page: number;
  pageSize: number;
}
