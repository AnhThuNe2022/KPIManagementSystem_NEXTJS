export enum EnumCodeNoti {
  COMPLAINT = 0,
  RESOLVED = 1,
  COMPLAINT_ADMIN = 2,
}

export interface NotificationItem {
  id: number;
  message: string;
  isRead: boolean;
  createdAt: string;
  linkNoti?: string | null;
}

export interface NotificationPage {
  unreadCount: number;
  total: number;
  items: NotificationItem[];
  page: number;
  pageSize: number;
}

export interface NotificationDto {
  alertGroupId?: string;
  userId?: string;
  senderUserId?: string;
  codeNoti?: string;
  message?: string;
}
