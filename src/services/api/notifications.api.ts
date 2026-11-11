import apiClient, { http } from './client';
import { ENDPOINTS } from '@/config/api';

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export const getNotifications = async (params?: { unread?: boolean; limit?: number; offset?: number }) => {
  const res = await apiClient.get<any>(ENDPOINTS.NOTIFICATIONS, { params });
  // Backend returns { success, data: { notifications, total } }
  const payload = res.data?.data ?? res.data;
  return payload as { notifications: Notification[]; total: number };
};

export const getUnreadCount = async (): Promise<number> => {
  const res = await apiClient.get<any>(`${ENDPOINTS.NOTIFICATIONS}/unread-count`);
  const payload = res.data?.data ?? res.data;
  return Number(payload?.count || 0);
};

export const markAsRead = (id: number | string) =>
  http.patch<any>(`${ENDPOINTS.NOTIFICATIONS}/${id}/read`, {});

export const markAllRead = () =>
  http.patch<any>(`${ENDPOINTS.NOTIFICATIONS}/read-all`, {});

export const dismissNotification = (id: number | string) =>
  http.delete<any>(`${ENDPOINTS.NOTIFICATIONS}/${id}`);
