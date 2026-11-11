import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppNotification {
  id: string;
  type: 'order' | 'stock' | 'promotion' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, string>;
  createdAt: string;
}

interface NavigationIntent {
  screen?: string;
  params?: Record<string, any>;
}

/** In-app order alert popup data (shown as a floating card on any screen) */
export interface OrderAlertData {
  orderId: string;
  orderNumber: string;
  total: string;
  customerName: string;
  customerPhone: string;
  itemsCount: number;
  paymentMethod: string;
}

interface NotificationState {
  fcmToken: string | null;
  notifications: AppNotification[];
  unreadCount: number;
  navigationIntent: NavigationIntent | null;
  /** Currently-displayed in-app order alert (null = hidden) */
  orderAlert: OrderAlertData | null;
}

interface NotificationActions {
  setFCMToken: (token: string | null) => void;
  addNotification: (notification: AppNotification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
  setNavigationIntent: (intent: NavigationIntent | null) => void;
  clearNavigationIntent: () => void;
  showOrderAlert: (alert: OrderAlertData) => void;
  dismissOrderAlert: () => void;
}

const initialState: NotificationState = {
  fcmToken: null,
  notifications: [],
  unreadCount: 0,
  navigationIntent: null,
  orderAlert: null,
};

export const useNotificationStore = create<NotificationState & NotificationActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setFCMToken: (token) => set({ fcmToken: token }),

      addNotification: (notification) => {
        const { notifications } = get();
        const newNotifications = [notification, ...notifications].slice(0, 50); // Keep last 50
        const unreadCount = newNotifications.filter((n) => !n.isRead).length;
        set({ notifications: newNotifications, unreadCount });
      },

      markAsRead: (notificationId) => {
        const { notifications } = get();
        const newNotifications = notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        );
        const unreadCount = newNotifications.filter((n) => !n.isRead).length;
        set({ notifications: newNotifications, unreadCount });
      },

      markAllAsRead: () => {
        const { notifications } = get();
        const newNotifications = notifications.map((n) => ({ ...n, isRead: true }));
        set({ notifications: newNotifications, unreadCount: 0 });
      },

      removeNotification: (notificationId) => {
        const { notifications } = get();
        const newNotifications = notifications.filter((n) => n.id !== notificationId);
        const unreadCount = newNotifications.filter((n) => !n.isRead).length;
        set({ notifications: newNotifications, unreadCount });
      },

      clearAllNotifications: () => {
        set({ notifications: [], unreadCount: 0 });
      },

      setNavigationIntent: (intent) => set({ navigationIntent: intent }),

      clearNavigationIntent: () => set({ navigationIntent: null }),

      showOrderAlert: (alert) => set({ orderAlert: alert }),

      dismissOrderAlert: () => set({ orderAlert: null }),
    }),
    {
      name: '@pyropark/notifications',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        fcmToken: state.fcmToken,
        notifications: state.notifications,
        unreadCount: state.unreadCount,
      }),
    }
  )
);

// Selectors
export const selectFCMToken = (state: NotificationState) => state.fcmToken;
export const selectNotifications = (state: NotificationState) => state.notifications;
export const selectUnreadCount = (state: NotificationState) => state.unreadCount;
export const selectNavigationIntent = (state: NotificationState) => state.navigationIntent;
