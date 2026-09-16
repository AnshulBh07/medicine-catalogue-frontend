import { apiClient } from './api-client';

export type NotificationType =
  | 'MEDICINE_EXPIRED'
  | 'MEDICINE_EXPIRING_SOON'
  | 'DEAL_INACTIVE_30_DAYS'
  | 'DEAL_CREATED'
  | 'DEAL_STATUS_CHANGED'
  | 'DEAL_RECEIVED'
  | 'MEDICINE_CREATED'
  | 'MEDICINE_UPDATED'
  | 'MEDICINE_DELETED'
  | 'MR_CREATED'
  | 'MR_UPDATED'
  | 'MR_DELETED'
  | 'MEDICINE_ALTERNATIVE_CREATED'
  | 'MEDICINE_ALTERNATIVE_UPDATED'
  | 'MEDICINE_ALTERNATIVE_DELETED';

export type NotificationPriority = 'CRITICAL' | 'ATTENTION' | 'UPDATE';

export type NotificationFilter = 'all' | 'unread' | 'critical' | 'updates';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  entityType: string;
  entityId: string | null;
  isRead: boolean;
  readAt: string | null;
  isResolved: boolean;
  resolvedAt: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface FetchNotificationsResponse {
  notifications: NotificationItem[];
  pagination: NotificationPagination;
  unreadCount: number;
}

export const fetchNotifications = async (params: {
  page?: number;
  limit?: number;
  filter?: NotificationFilter;
}): Promise<FetchNotificationsResponse> => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  if (params.filter && params.filter !== 'all') query.set('filter', params.filter);

  const queryString = query.toString();
  const url = queryString ? `/notifications?${queryString}` : '/notifications';
  return apiClient.get<FetchNotificationsResponse>(url);
};

export const fetchUnreadNotificationCount = async (): Promise<number> => {
  const response = await apiClient.get<{ unreadCount: number }>('/notifications/unread-count');
  return response.unreadCount ?? 0;
};

export const markNotificationAsRead = async (
  notificationId: string,
): Promise<NotificationItem> => {
  const response = await apiClient.patch<{ notification: NotificationItem }>(
    `/notifications/${notificationId}/read`,
    {},
  );
  return response.notification;
};

export const markAllNotificationsAsRead = async (): Promise<{ count: number }> => {
  return apiClient.post<{ message: string; count: number }>('/notifications/mark-all-read', {});
};
