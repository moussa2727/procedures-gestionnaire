import { NotificationType } from './enums';

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entity?: string | null;
  entityId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationListResult {
  items: NotificationResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}
