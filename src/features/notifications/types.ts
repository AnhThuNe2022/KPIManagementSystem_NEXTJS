export interface NotificationDto {
  alertGroupId?: string;

  userId?: string;

  senderUserId?: string;

  codeNoti?: string;

  message?: string;
}

export enum EnumCodeNoti
{
  COMPLAINT,
  RESOLVED,
  COMPLAINT_ADMIN
}

export interface NotificationItem {
  id: number;
  message: string;
  isRead: boolean;
  createdAt: string | null;
  linkNoti?: string | null;
}

export interface NotificationPage {
  unreadCount: number;
  total: number;
  items: NotificationItem[];
  page: number;
  pageSize: number;
}
